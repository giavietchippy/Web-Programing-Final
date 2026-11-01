<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class NoteAccessChanged implements ShouldBroadcastNow
{
    public function __construct(
        public readonly int $noteId,
        public readonly string $oldRoomKey,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("note.{$this->noteId}.{$this->oldRoomKey}")];
    }

    public function broadcastAs(): string
    {
        return 'note.access-changed';
    }

    public function broadcastWith(): array
    {
        // Tuyệt đối không gửi title/content ở đây; người nghe có thể đã bị thu hồi quyền.
        return ['note_id' => $this->noteId];
    }
}
