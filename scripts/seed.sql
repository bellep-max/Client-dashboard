-- Seed aeo_plans (campaigns)
INSERT INTO aeo_plans (business_id, name, plan_type, monthly_aeo_budget, search_address, current_answer_presence, search_boost_target, schema_implementor, created_by, subscription_id, card_last4, sample_question_1, sample_question_2, sample_question_3)
VALUES
  (1, 'Greens LI Brooklyn - 195 Bedford Ave, Brooklyn NY 11211', 'AEO Plan', 1500.00, '195 Bedford Avenue, Brooklyn, NY 11211', '15%', 80, 'us', 'admin', 'sub_abc123456789', '4242', 'Where can I get cannabis delivery in Brooklyn?', 'Best weed delivery near me Brooklyn', 'Is cannabis delivery legal in New York?'),
  (1, 'Greens LI - Long Island Location, Queens NY 11001', 'AEO Plan', 900.00, '500 Hempstead Turnpike, Queens, NY 11001', '5%', 60, 'client_dev', 'admin', 'sub_def987654321', '1234', 'Cannabis delivery Long Island NY', 'Weed delivery Queens same day', NULL),
  (2, 'Brooklyn Dental Smiles - Main Campaign', 'Local SEO', 750.00, '350 Atlantic Ave, Brooklyn, NY 11217', '0%', 50, 'us', 'admin', 'sub_ghi111222333', '5678', 'Best dentist in Brooklyn', 'Emergency dental near me Brooklyn', 'Teeth whitening Brooklyn NY'),
  (3, 'Ace Plumbing - Emergency Services', 'AEO Plan', 600.00, '890 Flatbush Ave, Brooklyn, NY 11226', '10%', 70, 'us', 'admin', 'sub_jkl444555666', '9999', 'Emergency plumber Brooklyn 24 hour', 'Plumber near me open now', 'Pipe burst repair Brooklyn');

-- Seed keywords
INSERT INTO keywords (business_id, aeo_plan_id, keyword, keyword_text, keyword_type, status, is_active, is_primary, verification_status, notes)
VALUES
  (1, 1, 'cannabis delivery brooklyn', 'cannabis delivery brooklyn', 'primary', 'active', true, true, 'verified', 'Top performing keyword'),
  (1, 1, 'weed delivery near me', 'weed delivery near me', 'primary', 'active', true, false, 'verified', NULL),
  (1, 1, 'marijuana delivery brooklyn ny', 'marijuana delivery brooklyn ny', 'secondary', 'active', true, false, 'pending', NULL),
  (1, 1, 'dispensary delivery brooklyn', 'dispensary delivery brooklyn', 'secondary', 'active', true, false, 'verified', NULL),
  (1, 1, 'same day weed delivery brooklyn', 'same day weed delivery brooklyn', 'long-tail', 'active', true, false, 'pending', NULL),
  (1, 2, 'cannabis delivery long island', 'cannabis delivery long island', 'primary', 'active', true, true, 'verified', NULL),
  (1, 2, 'weed delivery queens ny', 'weed delivery queens ny', 'primary', 'active', true, false, 'verified', NULL),
  (2, 3, 'dentist brooklyn ny', 'dentist brooklyn ny', 'primary', 'active', true, true, 'verified', NULL),
  (2, 3, 'emergency dentist near me brooklyn', 'emergency dentist near me brooklyn', 'primary', 'active', true, false, 'pending', NULL),
  (2, 3, 'teeth whitening brooklyn', 'teeth whitening brooklyn', 'secondary', 'active', true, false, 'verified', NULL),
  (3, 4, 'emergency plumber brooklyn', 'emergency plumber brooklyn', 'primary', 'active', true, true, 'verified', NULL),
  (3, 4, 'plumber near me brooklyn', 'plumber near me brooklyn', 'primary', 'active', true, false, 'verified', NULL),
  (3, 4, '24 hour plumber brooklyn ny', '24 hour plumber brooklyn ny', 'long-tail', 'active', true, false, 'pending', NULL);

-- Seed keyword_links
INSERT INTO keyword_links (keyword_id, business_id, url, description, link_type, ai_efficiency_percent, ai_accuracy_percent, ai_visibility_percent, ai_lifespan_days, ai_customer_insight, ai_analysis)
VALUES
  (1, 1, 'https://greensli.com/brooklyn-delivery', 'Main delivery page for Brooklyn', 'website', 87, 92, 78, 365, 'Customers searching this term are ready to order immediately', 'Strong local intent signal. Page is well-optimized.'),
  (1, 1, 'https://maps.google.com/?cid=12345', 'Google Maps listing', 'gmb', 95, 88, 91, NULL, 'High conversion from map clicks', 'GMB listing well-maintained with photos and reviews.'),
  (2, 1, 'https://greensli.com', 'Homepage', 'website', 70, 80, 75, 180, 'Broad intent, lower conversion', 'Homepage captures general interest but may need landing page.'),
  (8, 2, 'https://brooklyndentalsmiles.com', 'Dental practice homepage', 'website', 82, 90, 85, 365, 'High-value patients seeking routine care', 'Well-structured site with clear CTAs.'),
  (11, 3, 'https://aceplumbing.com/emergency', 'Emergency plumbing service page', 'website', 91, 95, 89, 365, 'Urgent need, price-insensitive customers', 'Emergency page ranks well for urgent queries.');
