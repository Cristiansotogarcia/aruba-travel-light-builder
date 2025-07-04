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
    answer: "A 3-day rental and $30 minimum is required.",
  },
  {
    question: "How long is a weekly rental?",
    answer: "Weekly rentals are between 5-7 days.",
  },
  {
    question: "Do you offer free delivery?",
    answer: "Free delivery is only available for weekly rentals.",
  },
  {
    question: "What's the delivery cost for short rentals?",
    answer: "There's a $10 delivery charge for non-weekly rentals.",
  },
  {
    question: "When do you deliver?",
    answer: "Delivery is available Monday through Saturday.",
  },
  {
    question: "Can I get a crib or pack and play delivered on Sunday?",
    answer: "Yes! We deliver on Sundays for a $20 fee.",
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
