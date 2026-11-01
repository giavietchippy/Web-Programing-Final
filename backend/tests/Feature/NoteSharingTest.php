<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NoteSharingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_share_and_revoke_with_permission_checks(): void
    {
        $alice = User::factory()->create(['email' => 'alice-test@example.com']);
        $bob = User::factory()->create(['email' => 'bob-test@example.com']);
        $note = Note::create(['user_id' => $alice->id, 'title' => 'Test', 'content' => 'Original']);

        $this->actingAs($alice)->postJson("/api/notes/{$note->id}/shares", [
            'emails' => [$bob->email], 'permission' => 'view',
        ])->assertOk();

        $this->actingAs($bob)->getJson("/api/notes/{$note->id}")->assertOk()
            ->assertJsonPath('data.permission', 'view');
        $this->actingAs($bob)->patchJson("/api/notes/{$note->id}", [
            'title' => 'Changed', 'content' => 'Changed',
        ])->assertForbidden();

        $this->actingAs($alice)->patchJson("/api/notes/{$note->id}/shares/{$bob->id}", [
            'permission' => 'edit',
        ])->assertOk();

        $this->actingAs($bob)->patchJson("/api/notes/{$note->id}", [
            'title' => 'Changed', 'content' => 'Changed',
        ])->assertOk();

        $this->actingAs($bob)->deleteJson("/api/notes/{$note->id}")->assertNotFound();

        $this->actingAs($alice)->deleteJson("/api/notes/{$note->id}/shares/{$bob->id}")
            ->assertOk();
        $this->actingAs($bob)->getJson("/api/notes/{$note->id}")->assertNotFound();
    }

    public function test_locked_shared_note_requires_password(): void
    {
        $alice = User::factory()->create(['email' => 'a@example.com']);
        $bob = User::factory()->create(['email' => 'b@example.com']);
        $note = Note::create(['user_id' => $alice->id, 'title' => 'Locked', 'content' => 'Hidden secret']);
        $note->password_hash = Hash::make('Secret123!');
        $note->save();

        // Alice must unlock before sharing a locked note.
        $this->actingAs($alice)->postJson("/api/notes/{$note->id}/unlock", [
            'password' => 'Secret123!',
        ])->assertOk();
        $this->actingAs($alice)->postJson("/api/notes/{$note->id}/shares", [
            'emails' => [$bob->email], 'permission' => 'view',
        ])->assertOk();
        $this->actingAs($alice)->postJson("/api/notes/{$note->id}/relock")->assertOk();

        $this->actingAs($bob)->getJson('/api/shared-notes')
            ->assertOk()->assertJsonPath('data.0.preview', '');
        $this->actingAs($bob)->getJson("/api/notes/{$note->id}")->assertStatus(423);
        $this->actingAs($bob)->postJson("/api/notes/{$note->id}/unlock", [
            'password' => 'Secret123!',
        ])->assertOk();
        $this->actingAs($bob)->getJson("/api/notes/{$note->id}")
            ->assertOk()->assertJsonPath('data.content', 'Hidden secret');
    }
}
