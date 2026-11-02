<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiService
{
    /**
     * Gọi Google Gemini (generateContent). Trả về văn bản AI sinh ra.
     * Ném RuntimeException (code = HTTP status) nếu lỗi; chi tiết lỗi chỉ ghi log, không trả cho người dùng.
     */
    public static function ask(string $system, string $userMessage, bool $json = false, int $maxTokens = 2048): string
    {
        $key = config('services.gemini.key');
        if (!$key) {
            throw new RuntimeException('Chưa cấu hình GEMINI_API_KEY.', 500);
        }

        $model = config('services.gemini.model');
        $generationConfig = ['temperature' => 0.2, 'maxOutputTokens' => $maxTokens];
        if ($json) {
            $generationConfig['responseMimeType'] = 'application/json';
        }

        $response = Http::withHeaders(['x-goog-api-key' => $key])
            ->timeout(45)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'systemInstruction' => ['parts' => [['text' => $system]]],
                'contents' => [['role' => 'user', 'parts' => [['text' => $userMessage]]]],
                'generationConfig' => $generationConfig,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Gemini lỗi HTTP '.$response->status().': '.$response->body(), $response->status());
        }

        if ($response->json('promptFeedback.blockReason')) {
            throw new RuntimeException('Gemini chặn yêu cầu: '.$response->json('promptFeedback.blockReason'), 422);
        }

        $text = collect($response->json('candidates.0.content.parts', []))
            ->reject(fn ($part) => !empty($part['thought']))
            ->pluck('text')
            ->implode('');

        if (trim($text) === '') {
            throw new RuntimeException('Gemini không trả về nội dung.', 502);
        }

        return trim($text);
    }
}