import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, ExternalLink, Minus, Plus } from "lucide-react";
import type { ProductCardData, ProductVariant } from "./types";

interface ProductCardsProps {
  cards: ProductCardData[];
  addedProductVariantId: string | null;
  onAddToCart: (card: ProductCardData, selectedVariant?: ProductVariant, quantity?: number) => void;
  onProductClick?: (card: ProductCardData) => void;
}

interface ProductSelections {
  [key: string]: {
    selectedVariant: ProductVariant | null;
    quantity: number;
  };
}

export function ProductCards({ cards, addedProductVariantId, onAddToCart, onProductClick }: ProductCardsProps) {
  const [selections, setSelections] = useState<ProductSelections>({});

  // Helper functions (unchanged)
  const getColorName = (color: string): string => {
    // A simplified map for brevity
    const colorMap: { [key: string]: string } = { '#000000': 'Black', '#ffffff': 'White', '#ff0000': 'Red', '#0000ff': 'Blue' };
    return colorMap[color?.toLowerCase()] || color;
  };

  const getSelection = (cardIndex: number) => selections[`card-${cardIndex}`] || { selectedVariant: null, quantity: 1 };
  const updateSelection = (cardIndex: number, updates: Partial<{ selectedVariant: ProductVariant | null; quantity: number }>) => {
    const key = `card-${cardIndex}`;
    setSelections(prev => ({ ...prev, [key]: { ...getSelection(cardIndex), ...updates } }));
  };
  const getUniqueColors = (variants: ProductVariant[]): string[] => [...new Set(variants.map(v => v.color))];
  const getAvailableSizes = (variants: ProductVariant[], selectedColor: string): string[] => [...new Set(variants.filter(v => v.color === selectedColor).map(v => v.size))];
  const findVariant = (variants: ProductVariant[], color: string, size: string): ProductVariant | undefined => variants.find(v => v.color === color && v.size === size);

  // Event handlers (unchanged logic)
  const handleColorSelect = (cardIndex: number, color: string, variants: ProductVariant[]) => {
    const availableSizes = getAvailableSizes(variants, color);
    const variant = findVariant(variants, color, availableSizes[0]);
    updateSelection(cardIndex, { selectedVariant: variant || null });
  };
  const handleSizeSelect = (cardIndex: number, size: string, selectedColor: string, variants: ProductVariant[]) => {
    const variant = findVariant(variants, selectedColor, size);
    updateSelection(cardIndex, { selectedVariant: variant || null });
  };
  const handleQuantityChange = (cardIndex: number, delta: number) => {
    const newQuantity = Math.max(1, getSelection(cardIndex).quantity + delta);
    updateSelection(cardIndex, { quantity: newQuantity });
  };
  const handleAddToCart = (card: ProductCardData, cardIndex: number) => {
    const { selectedVariant, quantity } = getSelection(cardIndex);
    if (card.variants?.length) {
      if (selectedVariant) onAddToCart(card, selectedVariant, quantity);
    } else {
      onAddToCart(card, undefined, quantity);
    }
  };

  // --- REVISED JSX & LAYOUT ---
  return (
    <div className="space-y-4">
      {cards.map((card, index) => {
        const selection = getSelection(index);
        const hasVariants = card.variants && card.variants.length > 0;
        const uniqueColors = hasVariants ? getUniqueColors(card.variants!) : [];
        const selectedColor = selection.selectedVariant?.color || uniqueColors[0];
        const availableSizes = hasVariants && selectedColor ? getAvailableSizes(card.variants!, selectedColor) : [];
        const selectedSize = selection.selectedVariant?.size || availableSizes[0];
        const canAddToCart = !hasVariants || !!selection.selectedVariant;
        const currentVariantId = selection.selectedVariant?.id || card.variantId;

        return (
          <div 
            key={index} 
            className="group/card flex flex-col sm:flex-row gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-300"
          >
            {/* Image Section */}
            {card.image && (
              <div 
                className="flex-shrink-0 cursor-pointer"
                onClick={() => onProductClick?.(card)}
                title="Click to view product details"
              >
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-40 h-40 sm:w-28 sm:h-28 object-cover rounded-md border border-gray-100 group-hover/card:border-gray-300 transition-colors"
                />
              </div>
            )}

            {/* Content Section */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
              {/* Top Part: Info & Variants */}
              <div className="flex flex-col gap-3">
                <div 
                  className="cursor-pointer" 
                  onClick={() => onProductClick?.(card)}
                  title="Click to view product details"
                >
                  <h4 className="font-semibold text-gray-900 text-base leading-tight hover:text-blue-600 transition-colors">
                    {card.name}
                  </h4>
                  {card.description && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {card.description}
                    </p>
                  )}
                </div>

                {/* Variants Selection */}
                {hasVariants && (
                  <div className="space-y-3">
                    {/* Color Selection */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1.5">
                        Color: <span className="font-semibold">{selectedColor ? getColorName(selectedColor) : 'N/A'}</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {uniqueColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleColorSelect(index, color, card.variants!)}
                            className={`w-6 h-6 rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                              selectedColor === color 
                                ? 'border-black scale-110 shadow' 
                                : 'border-gray-300 hover:border-gray-500'
                            }`}
                            style={{ backgroundColor: color }}
                            title={getColorName(color)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Size Selection */}
                    {selectedColor && availableSizes.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1.5">
                          Size: <span className="font-semibold">{selectedSize || 'N/A'}</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {availableSizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleSizeSelect(index, size, selectedColor, card.variants!)}
                              className={`px-2.5 py-1 text-xs font-medium border rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                                selectedSize === size
                                  ? 'border-black bg-black text-white'
                                  : 'border-gray-300 bg-white text-gray-800 hover:border-gray-600'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Part: Price & Actions - Wraps on small screens */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-3">
                   <span className="font-bold text-lg text-gray-800">
                      ${selection.selectedVariant?.price || card.price}
                    </span>
                   {/* Quantity Selector */}
                   <div className="flex items-center border border-gray-300 rounded-md">
                      <button
                        onClick={() => handleQuantityChange(index, -1)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-md"
                        disabled={selection.quantity <= 1}
                        title="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-3 text-sm font-medium min-w-[2.5rem] text-center text-gray-800">
                        {selection.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(index, 1)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 transition-colors rounded-r-md"
                        title="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {onProductClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => onProductClick(card)}
                    >
                      <ExternalLink className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={`h-9 w-24 transition-all duration-300 ${
                      addedProductVariantId === currentVariantId
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-900 hover:bg-gray-700"
                    }`}
                    onClick={() => handleAddToCart(card, index)}
                    disabled={addedProductVariantId === currentVariantId || !canAddToCart}
                  >
                    {addedProductVariantId === currentVariantId ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5" />
                        Added
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-1.5" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}