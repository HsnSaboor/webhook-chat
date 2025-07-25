
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

  const getColorName = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      '#000000': 'Black',
      '#ffffff': 'White',
      '#ff0000': 'Red',
      '#0000ff': 'Blue',
      '#008000': 'Green',
      '#ffff00': 'Yellow',
      '#800080': 'Purple',
      '#ffa500': 'Orange',
      '#ffc0cb': 'Pink',
      '#a52a2a': 'Brown',
      '#808080': 'Gray',
      '#000080': 'Navy',
      '#800000': 'Maroon',
      '#008080': 'Teal',
    };
    return colorMap[color.toLowerCase()] || color;
  };

  const getSelection = (cardIndex: number) => {
    const key = `card-${cardIndex}`;
    return selections[key] || { selectedVariant: null, quantity: 1 };
  };

  const updateSelection = (cardIndex: number, updates: Partial<{ selectedVariant: ProductVariant | null; quantity: number }>) => {
    const key = `card-${cardIndex}`;
    setSelections(prev => ({
      ...prev,
      [key]: { ...getSelection(cardIndex), ...updates }
    }));
  };

  const getUniqueColors = (variants: ProductVariant[]): string[] => {
    return [...new Set(variants.map(v => v.color))];
  };

  const getAvailableSizes = (variants: ProductVariant[], selectedColor: string): string[] => {
    return [...new Set(variants.filter(v => v.color === selectedColor).map(v => v.size))];
  };

  const findVariant = (variants: ProductVariant[], color: string, size: string): ProductVariant | undefined => {
    return variants.find(v => v.color === color && v.size === size);
  };

  const handleColorSelect = (cardIndex: number, color: string, variants: ProductVariant[]) => {
    const availableSizes = getAvailableSizes(variants, color);
    const firstAvailableSize = availableSizes[0];
    const variant = findVariant(variants, color, firstAvailableSize);
    updateSelection(cardIndex, { selectedVariant: variant || null });
  };

  const handleSizeSelect = (cardIndex: number, size: string, selectedColor: string, variants: ProductVariant[]) => {
    const variant = findVariant(variants, selectedColor, size);
    updateSelection(cardIndex, { selectedVariant: variant || null });
  };

  const handleQuantityChange = (cardIndex: number, delta: number) => {
    const current = getSelection(cardIndex).quantity;
    const newQuantity = Math.max(1, current + delta);
    updateSelection(cardIndex, { quantity: newQuantity });
  };

  const handleAddToCart = (card: ProductCardData, cardIndex: number) => {
    const selection = getSelection(cardIndex);
    if (card.variants && card.variants.length > 0) {
      if (selection.selectedVariant) {
        onAddToCart(card, selection.selectedVariant, selection.quantity);
      }
    } else {
      onAddToCart(card, undefined, selection.quantity);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {cards.map((card, index) => {
        const selection = getSelection(index);
        const hasVariants = card.variants && card.variants.length > 0;
        const uniqueColors = hasVariants ? getUniqueColors(card.variants!) : [];
        const selectedColor = selection.selectedVariant?.color || uniqueColors[0];
        const availableSizes = hasVariants && selectedColor ? getAvailableSizes(card.variants!, selectedColor) : [];
        const selectedSize = selection.selectedVariant?.size || availableSizes[0];
        const canAddToCart = !hasVariants || selection.selectedVariant;
        const currentVariantId = selection.selectedVariant?.id || card.variantId;

        return (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all duration-200 group">
            <div className="flex gap-3">
              {card.image && (
                <div 
                  className="flex-shrink-0 cursor-pointer" 
                  onClick={() => onProductClick?.(card)}
                  title="Click to view product"
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-16 h-16 object-cover rounded-md border border-gray-100 group-hover:border-gray-300 transition-colors"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div 
                  className="cursor-pointer" 
                  onClick={() => onProductClick?.(card)}
                  title="Click to view product"
                >
                  <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1 hover:text-blue-600 transition-colors">
                    {card.name}
                  </h4>
                  {card.description && (
                    <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                      {card.description}
                    </p>
                  )}
                </div>

                {/* Variants Selection */}
                {hasVariants && (
                  <div className="space-y-3 mb-3">
                    {/* Color Selection */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Color: {selectedColor ? getColorName(selectedColor) : 'Select Color'}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {uniqueColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(index, color, card.variants!)}
                            className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                              selectedColor === color 
                                ? 'border-black scale-110 shadow-md' 
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
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          Size: {selectedSize || 'Select Size'}
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {availableSizes.map((size) => (
                            <button
                              key={size}
                              onClick={() => handleSizeSelect(index, size, selectedColor, card.variants!)}
                              className={`px-2 py-1 text-xs border rounded transition-all duration-200 ${
                                selectedSize === size
                                  ? 'border-black bg-black text-white'
                                  : 'border-gray-300 text-gray-700 hover:border-gray-500'
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

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-600 text-sm">
                    {selection.selectedVariant?.price || card.price}
                  </span>
                  <div className="flex items-center space-x-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        onClick={() => handleQuantityChange(index, -1)}
                        className="p-1 hover:bg-gray-100 transition-colors"
                        disabled={selection.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 py-1 text-xs font-medium min-w-[2rem] text-center">
                        {selection.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(index, 1)}
                        className="p-1 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {onProductClick && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-medium border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700"
                        onClick={() => onProductClick(card)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className={`h-8 px-3 text-xs font-medium transition-all duration-200 ${
                        addedProductVariantId === currentVariantId
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-black hover:bg-gray-800 text-white"
                      }`}
                      onClick={() => handleAddToCart(card, index)}
                      disabled={addedProductVariantId === currentVariantId || !canAddToCart}
                    >
                      {addedProductVariantId === currentVariantId ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Added
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
