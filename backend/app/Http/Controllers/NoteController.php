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
    // Danh sách ghi chú của người dùng hiện tại, mới sửa gần nhất xếp trên cùng
    public function index(Request $request): JsonResponse
    {
        $notes = Note::query()
            ->where('user_id', $this->currentUserId($request))
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
            'title.required' => 'Vui long nhap tieu de.',
            'title.max' => 'Tiêu đề tối đa 255 ký tự.',
            'content.required' => 'Vui long nhap noi dung.',
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