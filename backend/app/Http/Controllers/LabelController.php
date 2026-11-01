<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesCurrentUser;
use App\Models\Label;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class LabelController extends Controller
{
    use ResolvesCurrentUser;

    // Danh sách tất cả nhãn của người dùng kèm số ghi chú đang dùng nhãn
    public function index(Request $request): JsonResponse
    {
        $labels = Label::query()
            ->where('user_id', $this->currentUserId($request))
            ->withCount('notes')
            ->orderBy('name')
            ->get()
            ->map(fn (Label $label) => $this->present($label));

        return response()->json(['data' => $labels]);
    }

    public function store(Request $request): JsonResponse
    {
        $label = Label::create([
            'user_id' => $this->currentUserId($request),
            'name' => $this->validatedName($request),
        ]);
        $label->loadCount('notes');

        return response()->json(['data' => $this->present($label)], 201);
    }

    // Đổi tên: ghi chú liên kết qua id nên tự hiển thị tên mới
    public function update(Request $request, int $label): JsonResponse
    {
        $record = $this->findOwned($request, $label);
        $record->update(['name' => $this->validatedName($request, $record->id)]);
        $record->loadCount('notes');

        return response()->json(['data' => $this->present($record)]);
    }

    // Xóa nhãn: chỉ xóa liên kết, các ghi chú vẫn được giữ nguyên
    public function destroy(Request $request, int $label): Response
    {
        $this->findOwned($request, $label)->delete();

        return response()->noContent();
    }

    private function validatedName(Request $request, ?int $ignoreId = null): string
    {
        $userId = $this->currentUserId($request);

        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('labels', 'name')->where('user_id', $userId)->ignore($ignoreId),
            ],
        ], [
            'name.required' => 'Vui lòng nhập tên nhãn.',
            'name.max' => 'Tên nhãn tối đa 50 ký tự.',
            'name.unique' => 'Nhãn này đã tồn tại.',
        ])['name'];
    }

    private function findOwned(Request $request, int $id): Label
    {
        return Label::query()
            ->where('user_id', $this->currentUserId($request))
            ->findOrFail($id);
    }

    private function present(Label $label): array
    {
        return [
            'id' => $label->id,
            'name' => $label->name,
            'notes_count' => $label->notes_count ?? 0,
        ];
    }
}