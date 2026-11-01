<?php

namespace App\Http\Controllers;

use App\Models\NoteShare;
use App\Models\User;
use App\Services\NoteAccessService;
use App\Services\NoteLockService;
use App\Services\NotePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class NoteShareController extends Controller
{
    public function received(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $keyword = mb_strtolower(trim($data['q'] ?? ''));

        $items = NoteShare::query()
            ->where('user_id', $request->user()->id)
            ->with(['note.labels', 'note.user:id,name,email'])
            ->orderByDesc('created_at')
            ->get()
            ->filter(function (NoteShare $share) use ($request, $keyword) {
                if ($keyword === '') return true;
                $note = $share->note;
                $titleMatch = mb_stripos($note->title, $keyword) !== false;
                $contentMatch = NoteLockService::isUnlocked($request, $note)
                    && mb_stripos($note->content, $keyword) !== false;
                return $titleMatch || $contentMatch;
            })
            ->map(fn (NoteShare $share) => NotePresenter::present($request, $share->note, false, $share))
            ->values();

        return response()->json(['data' => $items]);
    }

    public function recipients(Request $request, int $note): JsonResponse
    {
        $record = $this->ownedUnlocked($request, $note);
        $shares = $record->shares()->with('recipient:id,name,email')->orderBy('id')->get();

        return response()->json(['data' => $shares->map(fn (NoteShare $share) => $this->formatRecipient($share))]);
    }

    public function store(Request $request, int $note): JsonResponse
    {
        $record = $this->ownedUnlocked($request, $note);
        $data = $request->validate([
            'emails' => ['required', 'array', 'min:1', 'max:20'],
            'emails.*' => ['required', 'string', 'email', 'max:255'],
            'permission' => ['required', Rule::in(['view', 'edit'])],
        ]);
        $emails = collect($data['emails'])
            ->map(fn (string $email) => mb_strtolower(trim($email)))
            ->unique()->values();

        $users = $emails->map(function (string $email) use ($request) {
            $user = User::where('email', $email)->first();
            if (!$user || $user->id === $request->user()->id) {
                throw ValidationException::withMessages(['emails' => ["Email {$email} không hợp lệ, không tồn tại hoặc là email của bạn."]]);
            }
            return $user;
        });

        DB::transaction(function () use ($record, $users, $data) {
            foreach ($users as $user) {
                $share = NoteShare::firstOrNew(['note_id' => $record->id, 'user_id' => $user->id]);
                if (!$share->exists || $share->permission !== $data['permission']) {
                    $share->seen_at = null; // hiển thị thông báo mới cho người nhận
                }
                $share->permission = $data['permission'];
                $share->save();
            }
        });

        return $this->recipients($request, $note);
    }

    public function changePermission(Request $request, int $note, int $user): JsonResponse
    {
        $record = $this->ownedUnlocked($request, $note);
        $data = $request->validate(['permission' => ['required', Rule::in(['view', 'edit'])]]);
        $share = $record->shares()->where('user_id', $user)->firstOrFail();
        if ($share->permission !== $data['permission']) {
            $share->permission = $data['permission'];
            $share->seen_at = null;
            $share->save();
        }
        $share->load('recipient:id,name,email');
        return response()->json(['data' => $this->formatRecipient($share)]);
    }

    public function revoke(Request $request, int $note, int $user): JsonResponse
    {
        $record = $this->ownedUnlocked($request, $note);
        $share = $record->shares()->where('user_id', $user)->firstOrFail();
        $share->delete();
        return response()->json(['message' => 'Đã thu hồi quyền truy cập.']);
    }

    public function markSeen(Request $request, int $note): JsonResponse
    {
        $share = NoteShare::where('note_id', $note)->where('user_id', $request->user()->id)->firstOrFail();
        NoteLockService::requireUnlocked($request, $share->note);
        if ($share->seen_at === null) {
            $share->seen_at = now();
            $share->save();
        }
        return response()->json(['message' => 'Đã xem ghi chú.']);
    }

    private function ownedUnlocked(Request $request, int $id): \App\Models\Note
    {
        $record = NoteAccessService::owner($request, $id);
        NoteLockService::requireUnlocked($request, $record);
        return $record;
    }

    private function formatRecipient(NoteShare $share): array
    {
        return [
            'user_id' => $share->user_id,
            'name' => $share->recipient->name,
            'email' => $share->recipient->email,
            'permission' => $share->permission,
            'shared_at' => $share->created_at,
        ];
    }
}
