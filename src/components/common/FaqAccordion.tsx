import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { faqData } from './faqData';

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
                <AccordionTrigger className="text-sm lg:text-base font-medium text-left leading-tight break-words">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pt-1 pb-2 whitespace-pre-line">
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
