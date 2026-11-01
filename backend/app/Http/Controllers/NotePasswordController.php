<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Events\NoteAccessChanged;
use Illuminate\Support\Str;
use App\Services\NoteLockService;
use App\Services\NoteAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class NotePasswordController extends Controller
{
    private function owned(Request $request, int $id): Note
    {
        return Note::query()->where('user_id', $request->user()->id)->findOrFail($id);
    }

    public function enable(Request $request, int $note): JsonResponse
    {
        $record = $this->owned($request, $note);
        abort_if($record->password_hash !== null, 409, 'Ghi chú đã được bảo vệ.');

        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);
        $record->password_hash = Hash::make($data['password']);
        $record->timestamps = false;
        $record->save();
        NoteLockService::markUnlocked($request, $record);
        $this->rotateRoom($record);

        return response()->json(['is_locked' => true, 'is_unlocked' => true]);
    }

    public function unlock(Request $request, int $note): JsonResponse
    {
        $record = NoteAccessService::readable($request, $note);
        abort_if($record->password_hash === null, 409, 'Ghi chú này không có mật khẩu.');
        $data = $request->validate(['password' => ['required', 'string']]);

        if (!Hash::check($data['password'], $record->password_hash)) {
            throw ValidationException::withMessages(['password' => ['Mật khẩu ghi chú không đúng.']]);
        }

        NoteLockService::markUnlocked($request, $record);
        return response()->json(['is_locked' => true, 'is_unlocked' => true]);
    }

    public function relock(Request $request, int $note): JsonResponse
    {
        $record = NoteAccessService::readable($request, $note);
        NoteLockService::forget($request, $record);
        $this->rotateRoom($record);
        return response()->json(['is_unlocked' => $record->password_hash === null]);
    }

    public function change(Request $request, int $note): JsonResponse
    {
        $record = $this->owned($request, $note);
        abort_if($record->password_hash === null, 409, 'Ghi chú chưa được đặt mật khẩu.');
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);
        if (!Hash::check($data['current_password'], $record->password_hash)) {
            throw ValidationException::withMessages(['current_password' => ['Mật khẩu hiện tại không đúng.']]);
        }

        $record->password_hash = Hash::make($data['password']);
        $record->timestamps = false;
        $record->save();
        NoteLockService::markUnlocked($request, $record);
        $this->rotateRoom($record);
        return response()->json(['is_locked' => true, 'is_unlocked' => true]);
    }

    public function disable(Request $request, int $note): JsonResponse
    {
        $record = $this->owned($request, $note);
        abort_if($record->password_hash === null, 409, 'Ghi chú chưa được đặt mật khẩu.');
        $data = $request->validate(['current_password' => ['required', 'string']]);
        if (!Hash::check($data['current_password'], $record->password_hash)) {
            throw ValidationException::withMessages(['current_password' => ['Mật khẩu hiện tại không đúng.']]);
        }

        $record->password_hash = null;
        $record->timestamps = false;
        $record->save();
        NoteLockService::forget($request, $record);
        $this->rotateRoom($record);
        return response()->json(['is_locked' => false, 'is_unlocked' => true]);
    }
    private function rotateRoom(Note $note): void
    {
        $previous = $note->realtime_key;
        $note->realtime_key = Str::random(32);
        $note->timestamps = false;
        $note->save();
        event(new NoteAccessChanged($note->id, $previous));
    }
}
