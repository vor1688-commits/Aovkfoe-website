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
    OWNER to postgres;