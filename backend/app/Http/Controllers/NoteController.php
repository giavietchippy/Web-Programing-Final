<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesCurrentUser;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
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
            ->with('labels:id,name');

        if ($keyword !== '') {
            // Escape % và _ để người dùng gõ ký tự này vẫn được tìm đúng nghĩa đen
            $like = '%'.addcslashes($keyword, '\\%_').'%';
            $query->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)->orWhere('content', 'like', $like);
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
            ->map(fn (Note $note) => $this->present($note));

        return response()->json(['data' => $notes]);
    }

    // Lấy một ghi chú kèm nội dung đầy đủ (dùng cho màn hình sửa)
    public function show(Request $request, int $note): JsonResponse
    {
        return response()->json([
            'data' => $this->present($this->findOwned($request, $note), true),
        ]);
    }

    // Tạo ghi chú: chỉ bắt buộc title và content
    public function store(Request $request): JsonResponse
    {
        $note = Note::create([
            ...$this->validated($request),
            'user_id' => $this->currentUserId($request),
        ]);

        return response()->json(['data' => $this->present($note, true)], 201);
    }

    // Cập nhật ghi chú (được gọi liên tục bởi auto-save)
    public function update(Request $request, int $note): JsonResponse
    {
        $record = $this->findOwned($request, $note);
        $record->update($this->validated($request));

        return response()->json(['data' => $this->present($record, true)]);
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

        $record = $this->findOwned($request, $note);

        // Ghim/bỏ ghim không được làm thay đổi thời điểm sửa lần cuối
        $record->timestamps = false;
        // Đã ghim rồi mà ghim lại thì giữ nguyên thời điểm ghim cũ
        $record->pinned_at = $data['pinned'] ? ($record->pinned_at ?? now()) : null;
        $record->save();

        return response()->json(['data' => $this->present($record)]);
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

        $record = $this->findOwned($request, $note);
        $record->labels()->sync($data['label_ids']);
        $record->load('labels');

        return response()->json(['data' => $this->present($record)]);
    }

    public function destroy(Request $request, int $note): Response
    {
        $this->findOwned($request, $note)->delete();

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

    // Chỉ cho phép thao tác trên ghi chú của chính người dùng, không thấy thì trả 404
    private function findOwned(Request $request, int $id): Note
    {
        return Note::query()
            ->where('user_id', $this->currentUserId($request))
            ->findOrFail($id);
    }

    private function present(Note $note, bool $withContent = false): array
    {
        $note->loadMissing('labels:id,name');

        $data = [
            'id' => $note->id,
            'title' => $note->title,
            'preview' => Str::limit(trim($note->content), 300),
            'is_pinned' => $note->pinned_at !== null,
            'pinned_at' => $note->pinned_at,
            'labels' => $note->labels
                ->map(fn ($label) => ['id' => $label->id, 'name' => $label->name])
                ->values(),
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
        ];

        if ($withContent) {
            $data['content'] = $note->content;
        }

        return $data;
    }
}