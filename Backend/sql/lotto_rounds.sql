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