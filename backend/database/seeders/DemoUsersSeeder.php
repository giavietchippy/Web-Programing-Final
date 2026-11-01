<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['name' => 'Alice Demo', 'email' => 'alice@example.com', 'verified' => true],
            ['name' => 'Bob Demo', 'email' => 'bob@example.com', 'verified' => true],
            ['name' => 'Carol Demo', 'email' => 'carol@example.com', 'verified' => false],
        ];

        foreach ($accounts as $account) {
            if (User::where('email', $account['email'])->exists()) {
                continue;
            }

            $user = new User();
            $user->name = $account['name'];
            $user->email = $account['email'];
            $user->password = 'Demo@12345';
            $user->email_verified_at = $account['verified'] ? now() : null;
            $user->save();
        }
    }
}