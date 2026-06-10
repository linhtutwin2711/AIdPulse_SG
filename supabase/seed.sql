-- Demo data for the citizen dashboard + Track Cases map.
-- Additive and portable: hospitals/beds are matched by name (not hard-coded
-- UUIDs), so re-running just tops up bed types and adds the extra hospitals,
-- clusters, and sample reports. Assumes the base schema + the original
-- AidPulse seed (St. Mary's / Central General hospitals, the 5 core clusters)
-- already exist.

-- Extra bed types for the two original hospitals -----------------------------
insert into public.hospital_beds (hospital_id, bed_type, total_beds, available_beds, occupied_beds, reserved_beds)
            select id,'ICU',25,7,16,2                  from public.hospitals where name = 'St. Mary''s Hospital'
 union all  select id,'Emergency Department',40,12,26,2 from public.hospitals where name = 'St. Mary''s Hospital'
 union all  select id,'Maternity Ward',30,14,15,1      from public.hospitals where name = 'St. Mary''s Hospital'
 union all  select id,'General Ward',160,40,115,5      from public.hospitals where name = 'Central General Hospital'
 union all  select id,'ICU',24,9,14,1                  from public.hospitals where name = 'Central General Hospital'
 union all  select id,'Emergency Department',38,15,21,2 from public.hospitals where name = 'Central General Hospital';

-- Three more hospitals + their beds ------------------------------------------
insert into public.hospitals (name, address, latitude, longitude, is_active) values
 ('Tanjong Pagar Medical Centre','1 Tanjong Pagar Plaza, Singapore',1.2767,103.8456,true),
 ('Queenstown General Hospital','90 Stirling Rd, Singapore',1.2942,103.7861,true),
 ('Sengkang Emergency Hospital','110 Sengkang E Way, Singapore',1.3868,103.8914,true);

insert into public.hospital_beds (hospital_id, bed_type, total_beds, available_beds, occupied_beds, reserved_beds)
            select id,'General Ward',120,30,85,5        from public.hospitals where name = 'Tanjong Pagar Medical Centre'
 union all  select id,'ICU',20,2,17,1                  from public.hospitals where name = 'Tanjong Pagar Medical Centre'
 union all  select id,'General Ward',150,95,50,5       from public.hospitals where name = 'Queenstown General Hospital'
 union all  select id,'ICU',24,16,7,1                  from public.hospitals where name = 'Queenstown General Hospital'
 union all  select id,'Emergency Department',40,5,33,2  from public.hospitals where name = 'Sengkang Emergency Hospital'
 union all  select id,'General Ward',150,12,133,5      from public.hospitals where name = 'Sengkang Emergency Hospital';

-- Two more case clusters (diseases the map legend filters show) ---------------
insert into public.case_clusters (disease, title, description, area_name, latitude, longitude, active_cases, critical_cases, risk_level, is_banner) values
 ('dengue','Dengue cases rising in Bedok','Increased dengue reports around Bedok Reservoir.','Bedok',1.3236,103.9273,88,1,'medium',false),
 ('influenza','Flu cluster in Jurong East','Several influenza cases reported near Jurong East.','Jurong East',1.3331,103.7422,41,0,'low',false);

-- Sample citizen reports (live map dots) -------------------------------------
insert into public.reports (report_type, location_text, latitude, longitude, details, status) values
 ('symptoms','Tanjong Pagar Block 12',1.2769,103.8451,'Several residents reporting fever and body aches.','new'),
 ('crowded_area','Raffles Place MRT Exit B',1.2839,103.8515,'Heavy crowding during evening peak hour.','new'),
 ('positive_test','Geylang Lorong 21',1.3171,103.8862,'Positive COVID-19 self-test reported.','reviewing');
