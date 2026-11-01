<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use App\Events\NoteChanged;
use Tests\TestCase;

class NoteRealtimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_editor_update_increments_version_and_rejects_stale_update(): void
    {
        Event::fake([NoteChanged::class]);
        $alice = User::factory()->create();
        $note = Note::create(['user_id' => $alice->id, 'title' => 'N', 'content' => 'A']);
        $this->actingAs($alice)->patchJson("/api/notes/{$note->id}", [
            'title' => 'N', 'content' => 'B', 'content_version' => 0,
        ])->assertOk()->assertJsonPath('data.content_version', 1);
        $this->actingAs($alice)->patchJson("/api/notes/{$note->id}", [
            'title' => 'N', 'content' => 'C', 'content_version' => 0,
        ])->assertStatus(409);
        $this->assertDatabaseHas('notes', ['id' => $note->id, 'content' => 'B', 'content_version' => 1]);
        Event::assertDispatched(NoteChanged::class);
    }

    public function test_private_channel_denies_unauthorized_users(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::create(['user_id' => $alice->id, 'title' => 'Secret', 'content' => 'Private']);
        $room = "private-note.{$note->id}.{$note->realtime_key}";
        $this->actingAs($bob)->postJson('/broadcasting/auth', [
            'channel_name' => $room, 'socket_id' => '123.456',
        ])->assertForbidden();
    }
}
