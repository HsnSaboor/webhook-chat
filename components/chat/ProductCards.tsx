
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart, ExternalLink } from "lucide-react";
import type { ProductCardData } from "./types";

interface ProductCardsProps {
  cards: ProductCardData[];
  addedProductVariantId: string | null;
  onAddToCart: (card: ProductCardData) => void;
}

export const ProductCards: React.FC<ProductCardsProps> = ({
  cards,
  addedProductVariantId,
  onAddToCart,
}) => {
  return (
    <div className="mt-4 space-y-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200 group"
        >
          <div className="flex items-start space-x-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              <img
                src={card.image}
                alt={card.name}
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.jpg";
                }}
              />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1 group-hover:text-black transition-colors">
                {card.name}
              </h4>
              <p className="text-lg font-semibold text-gray-900 mb-3">
                {card.price}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onAddToCart(card)}
                  disabled={addedProductVariantId === card.variantId}
                  className="h-8 px-3 text-xs bg-black text-white hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:bg-green-500 disabled:text-white"
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

                {card.productUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(card.productUrl, "_blank")}
                    className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:text-black hover:border-black rounded-lg transition-all duration-200"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
