-- Table: public.lotto_types

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
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lotto_types
    OWNER to maharuay_db_user;