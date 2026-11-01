<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesCurrentUser;
use App\Models\Note;
use App\Services\NoteLockService;
use App\Services\NoteAccessService;
use App\Services\NotePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class NoteController extends Controller
{
    use ResolvesCurrentUser;

    // Danh sách ghi chú: ghim lên đầu; hỗ trợ tìm theo từ khóa và lọc theo nhãn
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'labels' => ['nullable', 'array', 'max:50'],
            'labels.*' => ['integer'],
        ], [
            'q.max' => 'Từ khóa tối đa 100 ký tự.',
            'labels.array' => 'Bộ lọc nhãn không hợp lệ.',
            'labels.*.integer' => 'Bộ lọc nhãn không hợp lệ.',
        ]);
        $keyword = trim($validated['q'] ?? '');
        $labelIds = array_map('intval', $validated['labels'] ?? []);

        $query = Note::query()
            ->where('user_id', $this->currentUserId($request))
            ->with('labels:id,name')
            ->withCount('shares');

        // Chỉ được tìm theo nội dung của ghi chú không khóa hoặc đã mở khóa trong phiên.
        $unlockedIds = Note::query()
            ->where('user_id', $this->currentUserId($request))
            ->whereNotNull('password_hash')
            ->get(['id', 'password_hash'])
            ->filter(fn (Note $note) => NoteLockService::isUnlocked($request, $note))
            ->pluck('id')
            ->all();

        if ($keyword !== '') {
            // Escape % và _ để người dùng gõ ký tự này vẫn được tìm đúng nghĩa đen
            $like = '%'.addcslashes($keyword, '\\%_').'%';
            $query->where(function ($q) use ($like, $unlockedIds) {
                $q->where('title', 'like', $like)
                    ->orWhere(function ($contentQuery) use ($like, $unlockedIds) {
                        $contentQuery->where('content', 'like', $like)
                            ->where(function ($visible) use ($unlockedIds) {
                                $visible->whereNull('password_hash');
                                if ($unlockedIds !== []) {
                                    $visible->orWhereIn('id', $unlockedIds);
                                }
                            });
                    });
            });
        }

        // Ghi chú có ít nhất một trong các nhãn được chọn
        if ($labelIds !== []) {
            $query->whereHas('labels', fn ($q) => $q->whereIn('labels.id', $labelIds));
        }

        $notes = $query
            ->orderByRaw('pinned_at IS NULL') // ghi chú đã ghim trước
            ->orderByDesc('pinned_at')        // ghim sau nằm trên
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Note $note) => NotePresenter::present($request, $note));

        return response()->json(['data' => $notes]);
    }

    // Lấy một ghi chú kèm nội dung đầy đủ (dùng cho màn hình sửa)
    public function show(Request $request, int $note): JsonResponse
    {
        return response()->json([
            'data' => NotePresenter::present($request, $this->findReadableAndUnlocked($request, $note), true),
        ]);
    }

    // Tạo ghi chú: chỉ bắt buộc title và content
    public function store(Request $request): JsonResponse
    {
        $note = Note::create([
            ...$this->validated($request),
            'user_id' => $this->currentUserId($request),
        ]);

        return response()->json(['data' => NotePresenter::present($request, $note, true)], 201);
    }

    // Cập nhật ghi chú (được gọi liên tục bởi auto-save)
    public function update(Request $request, int $note): JsonResponse
    {
        $record = $this->findEditableAndUnlocked($request, $note);
        $record->update($this->validated($request));

        return response()->json(['data' => NotePresenter::present($request, $record, true)]);
    }

    // Ghim hoặc bỏ ghim ghi chú
    public function pin(Request $request, int $note): JsonResponse
    {
        $data = $request->validate([
            'pinned' => ['required', 'boolean'],
        ], [
            'pinned.required' => 'Thiếu trạng thái ghim.',
            'pinned.boolean' => 'Trạng thái ghim không hợp lệ.',
        ]);

        $record = $this->findOwnedAndUnlocked($request, $note);

        // Ghim/bỏ ghim không được làm thay đổi thời điểm sửa lần cuối
        $record->timestamps = false;
        // Đã ghim rồi mà ghim lại thì giữ nguyên thời điểm ghim cũ
        $record->pinned_at = $data['pinned'] ? ($record->pinned_at ?? now()) : null;
        $record->save();

        return response()->json(['data' => NotePresenter::present($request, $record)]);
    }

    // Đặt toàn bộ nhãn của ghi chú (mảng rỗng = gỡ hết nhãn)
    public function syncLabels(Request $request, int $note): JsonResponse
    {
        $userId = $this->currentUserId($request);

        $data = $request->validate([
            'label_ids' => ['present', 'array', 'max:50'],
            // Chỉ cho phép gắn nhãn thuộc về chính người dùng
            'label_ids.*' => ['integer', Rule::exists('labels', 'id')->where('user_id', $userId)],
        ], [
            'label_ids.present' => 'Thiếu danh sách nhãn.',
            'label_ids.array' => 'Danh sách nhãn không hợp lệ.',
            'label_ids.*.exists' => 'Nhãn không tồn tại.',
            'label_ids.*.integer' => 'Nhãn không hợp lệ.',
        ]);

        $record = $this->findOwnedAndUnlocked($request, $note);
        $record->labels()->sync($data['label_ids']);
        $record->load('labels');

        return response()->json(['data' => NotePresenter::present($request, $record)]);
    }

    public function destroy(Request $request, int $note): Response
    {
        $this->findOwnedAndUnlocked($request, $note)->delete();

        return response()->noContent();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:100000'],
        ], [
            'title.required' => 'Vui lòng nhập tiêu đề.',
            'title.max' => 'Tiêu đề tối đa 255 ký tự.',
            'content.required' => 'Vui lòng nhập nội dung.',
            'content.max' => 'Nội dung quá dài.',
        ]);
    }

    // Xem: owner, editor hoặc viewer; chỉnh sửa: chỉ owner hoặc editor.
    private function findReadableAndUnlocked(Request $request, int $id): Note
    {
        $record = NoteAccessService::readable($request, $id);
        NoteLockService::requireUnlocked($request, $record);
        return $record;
    }

    private function findEditableAndUnlocked(Request $request, int $id): Note
    {
        $record = NoteAccessService::editable($request, $id);
        NoteLockService::requireUnlocked($request, $record);
        return $record;
    }

    private function findOwnedAndUnlocked(Request $request, int $id): Note
    {
        $record = NoteAccessService::owner($request, $id);
        NoteLockService::requireUnlocked($request, $record);
        return $record;
    }
}
