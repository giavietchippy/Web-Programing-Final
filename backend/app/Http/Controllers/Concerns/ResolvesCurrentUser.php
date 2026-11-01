<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Http\Request;

trait ResolvesCurrentUser
{
    // TẠM THỜI: khi có Sanctum thì chỉ cần return $request->user()->id và xóa phần fallback
    /**protected function currentUserId(Request $request): int
    {
        if ($request->user()) {
            return $request->user()->id;
        }

        abort_unless(app()->environment('local'), 401, 'Unauthenticated.');

        return User::where('email', 'demo@notes.local')->valueOrFail('id');
    }*/
    protected function currentUserId(Request $request): int
    {
        return $request->user()->id;
    }
}