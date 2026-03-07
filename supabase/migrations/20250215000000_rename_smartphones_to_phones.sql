-- Rename category 'Smartphones' to 'Phones' for consistency with the UI
UPDATE gadgets SET category = 'Phones' WHERE category = 'Smartphones';
