import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqData = [
  {
    question: "What currency are your prices listed in?",
    answer: "Prices are in USD.",
  },
  {
    question: "Is there a minimum rental duration or amount?",
    answer: "Yes, we require a minimum rental of 3 days and a minimum order total of $30. This helps us ensure efficient delivery and service across the island. If your selected items or rental period don’t meet the minimum, we’re happy to help you adjust your order to fit!",
  },
  {
    question: "How long is a weekly rental?",
    answer: "A weekly rental covers any period between 5 to 7 consecutive days. Whether you need the item for 5, 6, or 7 days, the weekly rate applies. If your rental exceeds 7 days, the daily rate will be added to the weekly rate for each additional day. Please note: Daily rates are only available for rentals shorter than 5 days.",
  },
  {
    question: "Is delivery and pickup free?",
    answer: "Delivery and pickup are free ONLY for weekly rentals (5–7 days). For non-weekly rentals, there is a one-time $10 delivery fee that covers both delivery and pickup. A $20 delivery fee applies for Sunday crib delivery",
  },
  
 {
  question: "What are the delivery and pickup time slots?",
  answer: `We offer two time slots for both delivery and pickup from Monday through Saturday:\n\n• Morning: 8:00 AM – 10:00 AM\n• Afternoon: 4:00 PM – 6:00 PM\n\n
  On Saturdays, afternoon slots are extended until 7:00 PM.\n\nSunday deliveries are only available for crib or pack and play rentals and are limited to the afternoon time slot.`,
},
 
  {
    question: "What if we need a crib or pack and play on sunday?",
    answer: "Sunday deliveries are available only if your order includes a crib or pack and play. A $20 delivery fee applies for Sunday crib delivery",
  },
];

interface FaqAccordionProps {
  className?: string;
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ className }) => {
  return (
    <div className={`w-full sticky top-0 lg:static ${className || ''}`}>
      <Card className="max-h-[80vh] overflow-auto w-full py-3">
        <CardHeader className="pb-2 pt-1">
          <CardTitle className="text-base">FAQ</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqData.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-sm lg:text-base font-small text-left leading-tight break-words">
  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-700 pt-1 pb-2">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaqAccordion;
