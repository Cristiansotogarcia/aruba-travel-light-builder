-- First, delete all existing categories
DELETE FROM "public"."equipment_category";

-- Then, insert the two new categories
INSERT INTO "public"."equipment_category" (name) VALUES
('Baby Equipment'),
('Beach Equipment');
