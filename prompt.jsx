when a service is selected , a optional input box should be added , which is used to add any care tip needed in each service and save this in supabase.after the complete button is clicked it should show a feedback dialog which is optional , when submit is clicked , it goes back to home. i will provide the tables below:
create table public.services (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  description text null,
  image_url text null,
  price numeric not null,
  estimated_time interval null,
  created_at timestamp with time zone null default now(),
  type public.service_type not null default 'checkbox'::service_type,
  constraint services_pkey primary key (id)
) TABLESPACE pg_default;
,
create table public.booking_services_selected (
  id uuid not null default extensions.uuid_generate_v4 (),
  booking_id uuid not null,
  service_id uuid not null,
  input_value text null,
  created_at timestamp with time zone not null default now(),
  constraint booking_services_selected_pkey primary key (id),
  constraint booking_services_selected_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint booking_services_selected_service_id_fkey foreign KEY (service_id) references services (id) on delete CASCADE
) TABLESPACE pg_default;
,
create table public.bookings (
  id uuid not null default extensions.uuid_generate_v4 (),
  customer_name text not null,
  contact_number text not null,
  dog_name text not null,
  dog_breed text not null,
  booking_date date not null,
  created_at timestamp with time zone null default now(),
  slot_time time without time zone null,
  sub_time_slot_id uuid null,
  status public.booking_status not null default 'reserved'::booking_status,
  constraint bookings_pkey primary key (id),
  constraint bookings_sub_time_slot_id_fkey foreign KEY (sub_time_slot_id) references sub_time_slots (id) on delete set null
) TABLESPACE pg_default;

