
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { ProductCardData } from "./types";

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
    <div className="cards-container mt-6">
      {cards.map((card, cardIndex) => (
        <Card
          key={cardIndex}
          className="card animate-bounce-in"
          style={{
            animationDelay: `${cardIndex * 100}ms`,
          }}
        >
          <CardContent className="p-2 flex flex-col items-center">
            <img
              src={card.image || "/placeholder.svg"}
              alt={card.name}
              className="w-24 h-24 object-cover rounded-md mb-2 shadow-sm"
              loading="lazy"
            />
            <h4 className="text-sm font-semibold text-foreground truncate w-full text-center mb-1">
              {card.name}
            </h4>
            <p className="text-base font-bold text-primary mb-2">
              {card.price}
            </p>
            <Button
              onClick={() => onAddToCart(card)}
              className="w-full text-xs py-1.5 h-auto bg-primary hover:bg-primary/90 transition-all duration-150 shadow-sm hover:shadow-md mb-1"
            >
              {addedProductVariantId === card.variantId ? (
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> Added!
                </span>
              ) : (
                "Add to Cart"
              )}
            </Button>
            {card.productUrl && (
              <a
                href={card.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-xs py-1 h-auto text-center text-muted-foreground hover:text-primary transition-colors duration-150"
              >
                View Product
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
