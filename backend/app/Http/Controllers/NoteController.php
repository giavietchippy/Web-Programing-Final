<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class NoteController extends Controller
{
    // Danh sách ghi chú: ghim lên đầu, hỗ trợ tìm theo từ khóa trong tiêu đề và nội dung
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(
            ['q' => ['nullable', 'string', 'max:100']],
            ['q.max' => 'Từ khóa tối đa 100 ký tự.'],
        );
        $keyword = trim($validated['q'] ?? '');

        $query = Note::query()->where('user_id', $this->currentUserId($request));

        if ($keyword !== '') {
            // Escape % và _ để người dùng gõ ký tự này vẫn được tìm đúng nghĩa đen
            $like = '%'.addcslashes($keyword, '\\%_').'%';
            $query->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)->orWhere('content', 'like', $like);
            });
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
        $data = [
            'id' => $note->id,
            'title' => $note->title,
            'preview' => Str::limit(trim($note->content), 300),
            'is_pinned' => $note->pinned_at !== null,
            'pinned_at' => $note->pinned_at,
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
        ];

        if ($withContent) {
            $data['content'] = $note->content;
        }

        return $data;
    }

    // TẠM THỜI: khi có Sanctum thì chỉ cần return $request->user()->id và xóa phần fallback
    private function currentUserId(Request $request): int
    {
        if ($request->user()) {
            return $request->user()->id;
        }

        abort_unless(app()->environment('local'), 401, 'Unauthenticated.');

        return User::where('email', 'demo@notes.local')->valueOrFail('id');
    }
}