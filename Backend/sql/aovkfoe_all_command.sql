-- Table: public.bet_items

-- DROP TABLE IF EXISTS public.bet_items;

CREATE TABLE IF NOT EXISTS public.bet_items
(
    id integer NOT NULL DEFAULT nextval('bet_items_id_seq'::regclass),
    bill_entry_id integer NOT NULL,
    bet_number character varying(10) COLLATE pg_catalog."default" NOT NULL,
    status character varying(50) COLLATE pg_catalog."default",
    price numeric(10,2) NOT NULL DEFAULT 0,
    bet_style character varying(10) COLLATE pg_catalog."default" NOT NULL DEFAULT 'บน'::character varying,
    rate numeric(10,2) NOT NULL DEFAULT 0,
    payout_amount numeric(12,2) NOT NULL DEFAULT 0,
    baht_per numeric(10,2),
    CONSTRAINT bet_items_pkey PRIMARY KEY (id),
    CONSTRAINT bet_items_bill_entry_id_fkey FOREIGN KEY (bill_entry_id)
        REFERENCES public.bill_entries (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.bet_items
    OWNER to maharuay_db_user;
-- Index: idx_bet_items_bill_entry_id

-- DROP INDEX IF EXISTS public.idx_bet_items_bill_entry_id;

CREATE INDEX IF NOT EXISTS idx_bet_items_bill_entry_id
    ON public.bet_items USING btree
    (bill_entry_id ASC NULLS LAST)
    TABLESPACE pg_default;


    -- Table: public.bill_entries

-- DROP TABLE IF EXISTS public.bill_entries;

CREATE TABLE IF NOT EXISTS public.bill_entries
(
    id integer NOT NULL DEFAULT nextval('bill_entries_id_seq'::regclass),
    bill_id integer NOT NULL,
    bet_type character varying(20) COLLATE pg_catalog."default" NOT NULL,
    total numeric(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT bill_entries_pkey PRIMARY KEY (id),
    CONSTRAINT bill_entries_bill_id_fkey FOREIGN KEY (bill_id)
        REFERENCES public.bills (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.bill_entries
    OWNER to maharuay_db_user;



    -- Table: public.bills

-- DROP TABLE IF EXISTS public.bills;

CREATE TABLE IF NOT EXISTS public.bills
(
    id integer NOT NULL DEFAULT nextval('bills_id_seq'::regclass),
    bill_ref character varying(25) COLLATE pg_catalog."default" NOT NULL,
    user_id integer NOT NULL,
    note text COLLATE pg_catalog."default",
    total_amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    bet_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    status bill_status NOT NULL DEFAULT 'รอผล'::bill_status,
    lotto_round_id integer,
    bill_lotto_draw timestamp with time zone,
    CONSTRAINT bills_pkey PRIMARY KEY (id),
    CONSTRAINT bills_bill_ref_key UNIQUE (bill_ref),
    CONSTRAINT bills_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT fk_lotto_round FOREIGN KEY (lotto_round_id)
        REFERENCES public.lotto_rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.bills
    OWNER to maharuay_db_user;



    -- Table: public.lotto_round_exemptions

-- DROP TABLE IF EXISTS public.lotto_round_exemptions;

CREATE TABLE IF NOT EXISTS public.lotto_round_exemptions
(
    id integer NOT NULL DEFAULT nextval('lotto_round_exemptions_id_seq'::regclass),
    lotto_round_id integer NOT NULL,
    exemption_type exemption_type NOT NULL,
    user_id integer,
    user_role user_role,
    CONSTRAINT lotto_round_exemptions_pkey PRIMARY KEY (id),
    CONSTRAINT lotto_round_exemptions_lotto_round_id_fkey FOREIGN KEY (lotto_round_id)
        REFERENCES public.lotto_rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT lotto_round_exemptions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_or_role_exemption CHECK (exemption_type = 'user'::exemption_type AND user_id IS NOT NULL AND user_role IS NULL OR exemption_type = 'role'::exemption_type AND user_role IS NOT NULL AND user_id IS NULL)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lotto_round_exemptions
    OWNER to maharuay_db_user;
-- Index: idx_lotto_round_exemptions_round_id

-- DROP INDEX IF EXISTS public.idx_lotto_round_exemptions_round_id;

CREATE INDEX IF NOT EXISTS idx_lotto_round_exemptions_round_id
    ON public.lotto_round_exemptions USING btree
    (lotto_round_id ASC NULLS LAST)
    TABLESPACE pg_default;


    
-- Table: public.lotto_round_number_limits

-- DROP TABLE IF EXISTS public.lotto_round_number_limits;

CREATE TABLE IF NOT EXISTS public.lotto_round_number_limits
(
    id integer NOT NULL DEFAULT nextval('lotto_round_number_limits_id_seq'::regclass),
    lotto_round_id integer NOT NULL,
    bet_number character varying(10) COLLATE pg_catalog."default" NOT NULL,
    max_amount numeric(12,2) NOT NULL,
    CONSTRAINT lotto_round_number_limits_pkey PRIMARY KEY (id),
    CONSTRAINT lotto_round_number_limits_lotto_round_id_fkey FOREIGN KEY (lotto_round_id)
        REFERENCES public.lotto_rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lotto_round_number_limits
    OWNER to maharuay_db_user;
-- Index: idx_lotto_round_number_limits_round_id

-- DROP INDEX IF EXISTS public.idx_lotto_round_number_limits_round_id;

CREATE INDEX IF NOT EXISTS idx_lotto_round_number_limits_round_id
    ON public.lotto_round_number_limits USING btree
    (lotto_round_id ASC NULLS LAST)
    TABLESPACE pg_default;



    -- Table: public.lotto_round_range_limits

-- DROP TABLE IF EXISTS public.lotto_round_range_limits;

CREATE TABLE IF NOT EXISTS public.lotto_round_range_limits
(
    id integer NOT NULL DEFAULT nextval('lotto_round_range_limits_id_seq'::regclass),
    lotto_round_id integer NOT NULL,
    range_start character varying(10) COLLATE pg_catalog."default" NOT NULL,
    range_end character varying(10) COLLATE pg_catalog."default" NOT NULL,
    max_amount numeric(12,2) NOT NULL,
    CONSTRAINT lotto_round_range_limits_pkey PRIMARY KEY (id),
    CONSTRAINT lotto_round_range_limits_lotto_round_id_fkey FOREIGN KEY (lotto_round_id)
        REFERENCES public.lotto_rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lotto_round_range_limits
    OWNER to maharuay_db_user;
-- Index: idx_lotto_round_range_limits_round_id

-- DROP INDEX IF EXISTS public.idx_lotto_round_range_limits_round_id;

CREATE INDEX IF NOT EXISTS idx_lotto_round_range_limits_round_id
    ON public.lotto_round_range_limits USING btree
    (lotto_round_id ASC NULLS LAST)
    TABLESPACE pg_default;



    -- Table: public.lotto_rounds

-- DROP TABLE IF EXISTS public.lotto_rounds;

CREATE TABLE IF NOT EXISTS public.lotto_rounds
(
    id integer NOT NULL DEFAULT nextval('lotto_rounds_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    cutoff_datetime timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    lotto_type_id integer,
    open_datetime timestamp with time zone,
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'active'::character varying,
    closed_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
    half_pay_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
    winning_numbers jsonb NOT NULL DEFAULT '{"2top": [], "3top": [], "3tote": [], "2bottom": [], "3bottom": []}'::jsonb,
    limit_2d_amount numeric(12,2),
    limit_3d_amount numeric(12,2),
    CONSTRAINT lotto_rounds_pkey PRIMARY KEY (id),
    CONSTRAINT fk_lotto_type FOREIGN KEY (lotto_type_id)
        REFERENCES public.lotto_types (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lotto_rounds
    OWNER to maharuay_db_user;



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


 

    -- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    role user_role NOT NULL DEFAULT 'user'::user_role,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to maharuay_db_user;



    -- สำหรับตาราง bills (สำคัญที่สุด)
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_lotto_round_id ON bills(lotto_round_id);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_bet_name ON bills(bet_name);

-- สำหรับตาราง bet_items
CREATE INDEX IF NOT EXISTS idx_bet_items_bill_entry_id ON bet_items(bill_entry_id);
CREATE INDEX IF NOT EXISTS idx_bet_items_bet_number ON bet_items(bet_number);