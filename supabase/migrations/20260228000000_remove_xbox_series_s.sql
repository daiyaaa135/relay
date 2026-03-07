-- Remove Xbox Series S references from stored valuation history.
-- (Model catalogs live in CSVs; this only cleans persisted analytics rows.)

DELETE FROM public.valuations
WHERE model_name IN ('Xbox Series S', 'Series S (2020)');
