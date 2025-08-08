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