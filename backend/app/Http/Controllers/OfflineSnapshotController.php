<?php

namespace App\Http\Controllers;

use App\Models\Label;
use App\Models\Note;
use App\Models\NoteShare;
use App\Services\NotePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfflineSnapshotController extends Controller
{
    // Toàn bộ dữ liệu của người dùng hiện tại để lưu dùng offline, chỉ gồm những gì họ được phép xem
    public function show(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $notes = Note::query()
            ->where('user_id', $userId)
            ->with('labels:id,name')
            ->withCount('shares')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Note $note) => NotePresenter::forOffline($request, $note))
            ->values();

        $shared = NoteShare::query()
            ->where('user_id', $userId)
            ->with(['note.labels', 'note.user:id,name,email'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (NoteShare $share) => NotePresenter::forOffline($request, $share->note, $share))
            ->values();

        $labels = Label::query()
            ->where('user_id', $userId)
            ->withCount('notes')
            ->orderBy('name')
            ->get()
            ->map(fn (Label $label) => [
                'id' => $label->id,
                'name' => $label->name,
                'notes_count' => $label->notes_count,
            ])
            ->values();

        return response()->json(['data' => [
            'notes' => $notes,
            'shared' => $shared,
            'labels' => $labels,
            'synced_at' => now()->toIso8601String(),
        ]]);
    }
}