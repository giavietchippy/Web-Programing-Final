<?php

namespace App\Services;

use App\Models\Note;
use App\Models\NoteShare;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NotePresenter
{
    public static function present(Request $request, Note $note, bool $full = false, ?NoteShare $share = null): array
    {
        $note->loadMissing('labels:id,name');
        $isOwner = (int) $note->user_id === (int) $request->user()->id;
        if (!$isOwner && !$share) $share = NoteAccessService::share($request, $note);

        $unlocked = NoteLockService::isUnlocked($request, $note);
        if ($isOwner && !$note->relationLoaded('shares') && !array_key_exists('shares_count', $note->getAttributes())) {
            $note->loadCount('shares');
        }
        $shared = $isOwner ? ($note->shares_count > 0) : true;
        if (!$isOwner) $note->loadMissing('user:id,name,email');

        $result = [
            'id' => $note->id,
            'title' => $note->title,
            'preview' => $unlocked ? Str::limit(trim($note->content), 300) : '',
            'is_locked' => $note->password_hash !== null,
            'is_unlocked' => $unlocked,
            'is_shared' => $shared,
            'permission' => $isOwner ? 'owner' : $share?->permission,
            'owner' => $isOwner ? null : [
                'name' => $note->user->name,
                'email' => $note->user->email,
            ],
            'shared_at' => $share?->created_at,
            'is_new' => $share !== null && $share->seen_at === null,
            'is_pinned' => $note->pinned_at !== null,
            'pinned_at' => $note->pinned_at,
            'labels' => $note->labels->map(fn ($label) => [
                'id' => $label->id, 'name' => $label->name,
            ])->values(),
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
        ];

        if ($full && $unlocked) $result['content'] = $note->content;
        return $result;
    }
}
