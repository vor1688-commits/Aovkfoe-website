-- =================================================================
-- Schema for public.lotto_types
-- =================================================================

-- DROP TABLE IF EXISTS public.lotto_types;

CREATE TABLE IF NOT EXISTS public.lotto_types
(
    id integer NOT NULL DEFAULT nextval('lotto_types_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    rate_3_top numeric(10,2) NOT NULL DEFAULT 0.00,
    rate_3_tote numeric(10,2) NOT NULL DEFAULT 0.00,
    rate_3_bottom numeric(10,2) NOT NULL DEFAULT 0.00,
    rate_2_top numeric(10,2) NOT NULL DEFAULT 0.00,
    rate_2_bottom numeric(10,2) NOT NULL DEFAULT 0.00,
    rate_run_top numeric(10,2) NOT NULL DEFAULT 0.00,
    rate_run_bottom numeric(10,2) NOT NULL DEFAULT 0.00,
    betting_start_time time without time zone,
    betting_cutoff_time time without time zone,
    generation_strategy character varying(50) COLLATE pg_catalog."default",
    interval_minutes integer,
    monthly_fixed_days integer[],
    monthly_floating_dates jsonb,
    specific_days_of_week integer[],
    betting_skip_start_day integer NOT NULL DEFAULT 0,
    CONSTRAINT lotto_types_pkey PRIMARY KEY (id),
    CONSTRAINT lotto_types_name_key UNIQUE (name)
);

ALTER TABLE IF EXISTS public.lotto_types
    OWNER to postgres;

-- =================================================================
-- Initial Data for public.lotto_types
-- =================================================================

-- Clear existing data before inserting to prevent conflicts with unique keys
TRUNCATE TABLE public.lotto_types RESTART IDENTITY CASCADE;

INSERT INTO public.lotto_types 
(id, name, rate_3_top, rate_3_tote, rate_3_bottom, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time, generation_strategy, interval_minutes, monthly_fixed_days, monthly_floating_dates, specific_days_of_week, betting_skip_start_day) 
VALUES
(1, 'หวยฮานอย พิเศษ', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '00:01:00', '17:05:00', 'daily', NULL, NULL, NULL, NULL, 0),
(2, 'หุ้นรัสเซีย', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '22:20:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(3, 'หุ้นเยอรมัน', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '23:05:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(4, 'หุ้นอังกฤษ', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '23:05:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(5, 'หุ้นดาวโจนส์', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '08:00:00', '02:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(6, 'หุ้นอินเดีย', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '16:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(7, 'หุ้นอียิปต์', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '19:05:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(8, 'หุ้นนิเคอิ เช้า', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '09:05:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(9, 'หุ้นจีน เช้า', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '10:05:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(10, 'หุ้นฮั่งเส็ง เช้า', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '10:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(11, 'หุ้นไต้หวัน', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '12:05:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(12, 'หุ้นเกาหลี', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '13:05:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(13, 'หุ้นนิเคอิ บ่าย', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '12:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(14, 'หุ้นจีน บ่าย', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '13:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(15, 'หุ้นฮั่งเส็ง บ่าย', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '14:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(16, 'หุ้นสิงคโปร์', 800.00, 0.00, 0.00, 92.00, 92.00, 0.00, 0.00, '04:00:00', '15:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,2,3,4,5], 0),
(17, 'หวยฮานอย', 850.00, 0.00, 0.00, 95.00, 95.00, 0.00, 0.00, '04:00:00', '18:05:00', 'daily', NULL, NULL, NULL, NULL, 0),
(18, 'หวยฮานอย VIP', 850.00, 0.00, 0.00, 95.00, 95.00, 0.00, 0.00, '01:00:00', '19:05:00', 'daily', NULL, NULL, NULL, NULL, 0),
(19, 'หวยประเทศไทย', 800.00, 125.00, 145.00, 90.00, 90.00, 0.00, 0.00, '08:00:00', '12:00:00', 'monthly_fixed_days', NULL, ARRAY[1,16], '[{"day": 2, "month": 5}]'::jsonb, NULL, 1),
(20, 'หวยลาว', 850.00, 0.00, 0.00, 95.00, 0.00, 0.00, 0.00, '08:00:00', '19:35:00', 'onlyday', NULL, NULL, NULL, ARRAY[1,3,5], 1);

