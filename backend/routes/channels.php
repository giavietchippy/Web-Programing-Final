<?php

use App\Models\Note;
use App\Services\NoteAccessService;
use App\Services\NoteLockService;
use Illuminate\Support\Facades\Broadcast;

// Chỉ người có quyền xem + đã mở khóa mới được nghe nội dung WebSocket.
// Đổi realtime_key khi thu hồi quyền để client cũ không thể nghe tiếp.
Broadcast::channel('note.{noteId}.{roomKey}', function ($user, $noteId, $roomKey) {
    $note = Note::find((int) $noteId);
    if (!$note || !is_string($roomKey) || !hash_equals((string) $note->realtime_key, $roomKey)) {
        return false;
    }
    $request = request();
    return $request->user()?->id === $user->id
        && NoteAccessService::permission($request, $note) !== null
        && NoteLockService::isUnlocked($request, $note);
});
