import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, ExternalLink } from "lucide-react";
import type { ProductCardData } from "./types";

interface ProductCardsProps {
  cards: ProductCardData[];
  addedProductVariantId: string | null;
  onAddToCart: (card: ProductCardData) => void;
  onProductClick?: (card: ProductCardData) => void;
}

export function ProductCards({ cards, addedProductVariantId, onAddToCart, onProductClick }: ProductCardsProps) {
  return (
    <div className="mt-3 space-y-3">
      {cards.map((card, index) => (
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
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-600 text-sm">
                  {card.price}
                </span>
                <div className="flex space-x-2">
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
                      addedProductVariantId === card.variantId
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-black hover:bg-gray-800 text-white"
                    }`}
                    onClick={() => onAddToCart(card)}
                    disabled={addedProductVariantId === card.variantId}
                  >
                    {addedProductVariantId === card.variantId ? (
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
      ))}
    </div>
  );
}