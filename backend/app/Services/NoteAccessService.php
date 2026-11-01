<?php

namespace App\Services;

use App\Models\Note;
use App\Models\NoteShare;
use Illuminate\Http\Request;

class NoteAccessService
{
    public static function owner(Request $request, int $id): Note
    {
        return Note::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);
    }

    public static function readable(Request $request, int $id): Note
    {
        $note = Note::findOrFail($id);
        abort_unless(self::permission($request, $note) !== null, 404);
        return $note;
    }

    public static function editable(Request $request, int $id): Note
    {
        $note = self::readable($request, $id);
        abort_unless(in_array(self::permission($request, $note), ['owner', 'edit'], true), 403, 'Bạn chỉ có quyền xem ghi chú.');
        return $note;
    }

    public static function share(Request $request, Note $note): ?NoteShare
    {
        if ($note->user_id === $request->user()->id) return null;

        return NoteShare::query()
            ->where('note_id', $note->id)
            ->where('user_id', $request->user()->id)
            ->first();
    }

    public static function permission(Request $request, Note $note): ?string
    {
        if ((int) $note->user_id === (int) $request->user()->id) return 'owner';
        return self::share($request, $note)?->permission;
    }
}
