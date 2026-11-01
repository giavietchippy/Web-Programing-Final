<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            ->map(fn (Note $note) => [
                'id' => $note->id,
                'title' => $note->title,
                // Chỉ trả về đoạn xem trước, nội dung đầy đủ sẽ lấy ở màn hình sửa
                'preview' => Str::limit(trim($note->content), 300),
                'created_at' => $note->created_at,
                'updated_at' => $note->updated_at,
            ]);

        return response()->json(['data' => $notes]);
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