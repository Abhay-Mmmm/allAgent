interface Product {
    id: string;
    name: string;
    acceptance: number;
}

const mockProducts: Product[] = [
    { id: '1', name: 'Micro-Crop Shield', acceptance: 88 },
    { id: '2', name: 'Rural Life Plus', acceptance: 64 },
];

export const AIRecommendations = () => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">AI Product Recommendations</h3>
            </div>

            {/* Products */}
            <div className="p-4 space-y-4">
                {mockProducts.map((product) => (
                    <div key={product.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-medium">{product.name}</span>
                            <span className={`text-sm font-medium ${product.acceptance >= 80 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                {product.acceptance}% Acceptance
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${product.acceptance >= 80
                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                        : 'bg-gradient-to-r from-slate-400 to-slate-500'
                                    }`}
                                style={{ width: `${product.acceptance}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
