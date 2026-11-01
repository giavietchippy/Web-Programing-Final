
<?php

namespace App\Services;

use App\Models\Note;
use Illuminate\Http\Request;

class NoteLockService
{
    public static function isUnlocked(Request $request, Note $note): bool
    {
        if ($note->password_hash === null) {
            return true;
        }

        $stored = $request->session()->get('unlocked_notes.'. $note->id);
        $expected = hash('sha256', $note->password_hash);

        return is_string($stored) && hash_equals($expected, $stored);
    }

    public static function requireUnlocked(Request $request, Note $note): void
    {
        abort_unless(
            self::isUnlocked($request, $note),
            423,
            'Ghi chú đang khóa. Vui lòng nhập mật khẩu.'
        );
    }

    public static function markUnlocked(Request $request, Note $note): void
    {
        $request->session()->put(
            'unlocked_notes.'. $note->id,
            hash('sha256', $note->password_hash)
        );
    }

    public static function forget(Request $request, Note $note): void
    {
        $request->session()->forget('unlocked_notes.'. $note->id);
    }
}
