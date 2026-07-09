-- The Adulting Life — subcategories (dividers)
-- Each of the 5 top-level categories has a fixed set of subcategory "dividers",
-- taken verbatim from the printed Life Admin Organiser. Users file records and
-- documents under these subcategories.
--
-- `tal_form` marks the "TAL - ..." items that have a bespoke structured form
-- (as opposed to being pure document dividers). Phase 1 treats them all the
-- same at the data level; this flag lets the UI later render a tailored form
-- vs a generic record form.
--
-- Run in Supabase SQL editor after 001_init.sql has been applied.

create table if not exists public.subcategories (
  id text primary key,                                            -- 'personal.birth_certificates'
  category_id text not null references public.categories(id),
  name text not null,
  hint text,                                                      -- optional sub-line under the name
  tal_form boolean not null default false,
  sort_order int not null default 0
);

create index if not exists subcategories_category_idx
  on public.subcategories (category_id, sort_order);

-- ---------------------------------------------------------------------------
-- Seed. Order matches the printed dividers exactly.
-- ---------------------------------------------------------------------------

-- Personal
insert into public.subcategories (id, category_id, name, hint, tal_form, sort_order) values
  ('personal.general_information',         'personal', 'TAL — General Information Form',            null,                              true,  1),
  ('personal.birth_certificates',          'personal', 'Birth Certificates',                        null,                              false, 2),
  ('personal.marriage_certificate',        'personal', 'Marriage Certificate',                      null,                              false, 3),
  ('personal.passport_travel',             'personal', 'Passport & Travel Documents',               null,                              false, 4),
  ('personal.will_funeral',                'personal', 'Will & Funeral Instructions',               null,                              false, 5),
  ('personal.power_of_attorney',           'personal', 'Power of Attorney Details',                 null,                              false, 6),
  ('personal.advanced_health_directive',   'personal', 'Advanced Health Directive',                 null,                              false, 7),
  ('personal.electoral_roll',              'personal', 'Electoral Roll Number & Registered Address',null,                              false, 8),
  ('personal.tax_file_number',             'personal', 'Tax File Number',                           null,                              false, 9),
  ('personal.abn',                         'personal', 'ABN',                                       null,                              false, 10),
  ('personal.list_of_accounts',            'personal', 'TAL — List of Personal Accounts',           'ie. Facebook / Apps / Banking',   true,  11),
  ('personal.licences_ids',                'personal', 'Copy of Licences & ID''s',                  null,                              false, 12),
  ('personal.vehicle_details',             'personal', 'TAL — Vehicle Details & Copy of Registration Certificate', null,               true,  13),
  ('personal.accident_information',        'personal', 'TAL — Accident Information Form',           null,                              true,  14),
  ('personal.home_property_rates_rent',    'personal', 'Home/Property Rates & Rent',                null,                              false, 15),
  ('personal.daily_routine_planner',       'personal', 'TAL — Daily Routine Planner',               null,                              true,  16),
  ('personal.other',                       'personal', 'Other',                                     null,                              false, 17)
on conflict (id) do nothing;

-- Health & Wellbeing
insert into public.subcategories (id, category_id, name, hint, tal_form, sort_order) values
  ('health.medical_advisers',       'health', 'TAL — List of Medical Advisers',                          null, true,  1),
  ('health.medication_list',        'health', 'TAL — Medication List',                                    null, true,  2),
  ('health.health_insurance_cards', 'health', 'Copy Health Insurance Details & Statements of Health Cards', null, false, 3),
  ('health.concession_cards',       'health', 'Copy of Concession Cards',                                 null, false, 4),
  ('health.pension_cards',          'health', 'Copy of Pension Cards',                                    null, false, 5),
  ('health.health_insurance',       'health', 'Health Insurance Details & Statements',                    null, false, 6),
  ('health.life_insurance',         'health', 'Life Insurance Details & Statements',                      null, false, 7),
  ('health.my_health_plan',         'health', 'TAL — My Health Plan',                                     null, true,  8),
  ('health.dental_records',         'health', 'Dental Records',                                           null, false, 9),
  ('health.scripts',                'health', 'Copy of Scripts',                                          null, false, 10),
  ('health.blood_tests',            'health', 'Blood Test Results',                                       null, false, 11),
  ('health.specialist_reports',     'health', 'Specialist Reports',                                       null, false, 12),
  ('health.referrals',              'health', 'Referrals',                                                null, false, 13),
  ('health.hospital_discharge',     'health', 'Hospital Discharge Records',                               null, false, 14),
  ('health.medical_reports',        'health', 'Medical Reports',                                          null, false, 15),
  ('health.medical_bills',          'health', 'Medical Bills',                                            null, false, 16),
  ('health.meal_planning',          'health', 'Meal Planning & Shopping Lists',                           null, false, 17),
  ('health.favourite_recipes',      'health', 'Favourite Recipes',                                        null, false, 18),
  ('health.life_goals_plans',       'health', 'Life Goals & Plans',                                       null, false, 19),
  ('health.mind_set',               'health', 'Mind Set',                                                 null, false, 20),
  ('health.retirement_pension',     'health', 'Retirement / Pension Plan',                                null, false, 21)
on conflict (id) do nothing;

-- Education
insert into public.subcategories (id, category_id, name, hint, tal_form, sort_order) values
  ('education.courses_enrolment',        'education', 'TAL — Courses & Enrolment Details Form',      null, true,  1),
  ('education.enrolment_documents',      'education', 'Copy of Enrolment Documents',                 null, false, 2),
  ('education.primary_details',          'education', 'Primary Education Details & Results',         null, false, 3),
  ('education.secondary_details',        'education', 'Secondary Education Details & Results',       null, false, 4),
  ('education.tertiary_details',         'education', 'Tertiary Education Details & Results',        null, false, 5),
  ('education.other_courses_details',    'education', 'Other Courses Education Details & Results',   null, false, 6),
  ('education.achievement_certificates', 'education', 'Achievement Certificates',                    null, false, 7),
  ('education.study_plan',               'education', 'Study Plan',                                  null, false, 8),
  ('education.course_storage',           'education', 'Course Storage',                              null, false, 9),
  ('education.other',                    'education', 'Other',                                       null, false, 10)
on conflict (id) do nothing;

-- Employment
insert into public.subcategories (id, category_id, name, hint, tal_form, sort_order) values
  ('employment.employee_information_form', 'employment', 'TAL — Employee Information Form', 'To give to employer', true,  1),
  ('employment.cover_letter',              'employment', 'Cover Letter',                    'To apply for a job',  false, 2),
  ('employment.resume',                    'employment', 'Resume',                          null,                  false, 3),
  ('employment.letters_of_recommendation', 'employment', 'Letters of Recommendation',       null,                  false, 4),
  ('employment.volunteering_certificates', 'employment', 'Volunteering Certificates',       null,                  false, 5),
  ('employment.employee_contracts',        'employment', 'Employee Contracts',              null,                  false, 6),
  ('employment.job_description',           'employment', 'Job Description',                 null,                  false, 7),
  ('employment.employment_reviews',        'employment', 'Employment Reviews',              null,                  false, 8),
  ('employment.correspondence',            'employment', 'Correspondence',                  null,                  false, 9),
  ('employment.wages_summaries',           'employment', 'Wages Summaries',                 null,                  false, 10),
  ('employment.annual_payment_summary',    'employment', 'Annual Payment Summary Report',   null,                  false, 11),
  ('employment.other',                     'employment', 'Other',                           null,                  false, 12)
on conflict (id) do nothing;

-- Admin & Bookkeeping
insert into public.subcategories (id, category_id, name, hint, tal_form, sort_order) values
  ('admin.bank_accounts_advisers',      'admin', 'TAL — List of Bank Accounts & Advisers',       null, true,  1),
  ('admin.bank_statements',             'admin', 'Bank Statements',                              null, false, 2),
  ('admin.loan_statements',             'admin', 'Loan Statements',                              null, false, 3),
  ('admin.budgets',                     'admin', 'Budgets',                                      null, false, 4),
  ('admin.investments_deeds',           'admin', 'Investments & Deeds',                          null, false, 5),
  ('admin.super_statements',            'admin', 'Superannuation Fund Statements',               null, false, 6),
  ('admin.property_records',            'admin', 'Property Records',                             null, false, 7),
  ('admin.annual_tax_report',           'admin', 'Annual Taxation Report',                       null, false, 8),
  ('admin.tax_payment_plans',           'admin', 'Tax Payment Plans',                            null, false, 9),
  ('admin.home_insurance',              'admin', 'Home Insurance',                               null, false, 10),
  ('admin.other_business_insurance',    'admin', 'Other Business / Property Insurance',          null, false, 11),
  ('admin.vehicle_insurance',           'admin', 'Vehicle Insurance Policies',                   null, false, 12),
  ('admin.telephone_devices',           'admin', 'Telephone & Devices Contracts & Statements',   null, false, 13),
  ('admin.electricity_gas',             'admin', 'Electricity & Gas Contracts & Statements',     null, false, 14),
  ('admin.rates_water',                 'admin', 'Rates & Water Documents',                      null, false, 15),
  ('admin.rental_agreements',           'admin', 'Rental Agreements',                            null, false, 16),
  ('admin.warranties',                  'admin', 'Warranties on devices & tools',                null, false, 17),
  ('admin.other',                       'admin', 'Other',                                        null, false, 18),
  ('admin.invoices_jul_jun',            'admin', 'Invoices July to June',                        null, false, 19)
on conflict (id) do nothing;
