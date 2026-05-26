-- ============================================================================
-- Kavra — Seed Data: Modüller + Örnek Teknikler + AI Kişilikleri
-- Migration: 0003_seed_data
-- Not: 150 tekniğin tamamı packages/shared/src/techniques-seed.ts'te;
-- bu migration sadece modülleri ve örnek 10 tekniği seed eder.
-- Tam seed için `pnpm db:seed` çalıştırılır.
-- ============================================================================

-- ---- MODÜLLER (M1-M7) ----
insert into modules (code, kind, name, name_en, description, icon, display_order) values
  ('M1', 'technique_module', 'Hafıza ve Kodlama', 'Memory & Encoding',
   'Bilginin uzun süreli hafızaya yerleşmesi için 18 teknik.', 'brain', 1),
  ('M2', 'technique_module', 'Üstbiliş ve Planlama', 'Metacognition & Planning',
   'Öğrenme süreçlerini izleme ve planlama için 15 teknik.', 'target', 2),
  ('M3', 'technique_module', 'Uygulama ve Pekiştirme', 'Practice & Reinforcement',
   'Aktif uygulama yoluyla pekiştirme için 15 teknik.', 'dumbbell', 3),
  ('M4', 'technique_module', 'Not Alma ve Görselleştirme', 'Notes & Visualization',
   'Bilginin yapılandırılması ve görselleştirilmesi için 16 teknik.', 'map', 4),
  ('M5', 'technique_module', 'Sosyal ve İşbirlikçi', 'Social & Collaborative',
   'AI ile diyalog yoluyla sosyal öğrenme için 12 teknik.', 'users', 5),
  ('M6', 'technique_module', 'Odaklanma ve Zihin Yönetimi', 'Focus & Mind Management',
   'Dikkat ve zaman yönetimi için 14 teknik.', 'zap', 6),
  ('M7', 'technique_module', 'Zihinsel Modeller ve Mantık', 'Mental Models & Logic',
   'İleri düzey düşünme çerçeveleri için 10 teknik.', 'compass', 7);

-- ---- AI KATEGORİLERİ (C1-C10) ----
insert into modules (code, kind, name, name_en, description, icon, display_order) values
  ('C1', 'ai_category', 'AI Destekli Kişiselleştirme', 'AI Personalization',
   'Engine davranışı: zorluk ayarı, unutma eğrisi, yanlış madenciliği.', 'sparkles', 10),
  ('C2', 'ai_category', 'Oyun Teorisi ve Motivasyon', 'Gamification & Motivation',
   'Engine davranışı: kayıptan kaçınma, zirve-son, IKEA etkisi.', 'trophy', 11),
  ('C3', 'ai_category', 'Bilişsel Yük Yönetimi', 'Cognitive Load',
   'Engine davranışı: flipped classroom, geriye zincirleme, scaffolding.', 'layers', 12),
  ('C4', 'ai_category', 'Disiplinlerarası', 'Interdisciplinary',
   'Engine davranışı: kavram melezleme, çapa hikaye, etimoloji.', 'git-merge', 13),
  ('C5', 'ai_category', 'Duygu Durumu', 'Emotional State',
   'Engine davranışı: yeniden değerlendirme, sessizlik protokolü.', 'heart', 14),
  ('C6', 'ai_category', 'İçerik Üretimi', 'Content Generation',
   'Engine davranışı: Bloom geçişi, sinyal-gürültü, analog DB.', 'feather', 15),
  ('C7', 'ai_category', 'Geri Bildirim', 'Feedback & Errors',
   'Engine davranışı: gecikmeli geri bildirim, 5 neden, rubrik şeffaflığı.', 'message-square-warning', 16),
  ('C8', 'ai_category', 'Proje ve Ürün Odaklı', 'Project-Based',
   '1-sayfa brief, sahte kitle, günlük keşif, reconstruction.', 'briefcase', 17),
  ('C9', 'ai_category', 'Yaratıcılık ve Sentez', 'Creativity & Synthesis',
   'Rastgele girdi, Disney stratejisi, PMI, defamiliarization.', 'palette', 18),
  ('C10', 'ai_category', 'Değerlendirme ve Sınav', 'Assessment & Exam',
   'Ön test, beyaz sayfa, mental contrasting, post-exam autopsy.', 'clipboard-check', 19);

-- ---- ÖRNEK TEKNİKLER (tam liste seed script'inde) ----
-- M1 Hafıza ve Kodlama'dan 3 örnek
insert into techniques (module_id, code, name, name_en, short_description, kind, suitable_for, difficulty_level, estimated_duration_minutes, ui_component) values
  ((select id from modules where code = 'M1'), 'M1-T01', 'Aktif Geri Çağırma', 'Active Recall',
   'Notlara bakmadan bilgiyi zihinden çağırma.', 'student_facing',
   array['review', 'weak_spot'], 2, 15, 'flashcard'),
  ((select id from modules where code = 'M1'), 'M1-T02', 'Aralıklı Tekrar', 'Spaced Repetition',
   'Artan zaman aralıklarıyla tekrar ederek unutma eğrisine karşı koyma.', 'student_facing',
   array['review'], 1, 10, 'flashcard'),
  ((select id from modules where code = 'M1'), 'M1-T05', 'Zihin Sarayı', 'Method of Loci',
   'Bilgiyi tanıdık bir mekandaki nesnelere bağlayarak hatırlama.', 'student_facing',
   array['memorization'], 4, 30, 'chat');

-- M2 Üstbiliş'ten 2 örnek
insert into techniques (module_id, code, name, name_en, short_description, kind, suitable_for, difficulty_level, estimated_duration_minutes, ui_component) values
  ((select id from modules where code = 'M2'), 'M2-T01', 'Feynman Tekniği', 'Feynman Technique',
   'Bir konuyu basit bir dille, bir çocuğa anlatıyormuş gibi açıklama.', 'student_facing',
   array['first_exposure', 'practice'], 3, 20, 'chat'),
  ((select id from modules where code = 'M2'), 'M2-T02', 'SQ3R Metodu', 'SQ3R Method',
   'Oku, Sor, Oku, Anlat, Gözden Geçir adımlarıyla aktif okuma.', 'student_facing',
   array['first_exposure'], 2, 45, 'chat');

-- C1'den 2 engine_behavior örneği
insert into techniques (module_id, code, name, name_en, short_description, kind, ui_component) values
  ((select id from modules where code = 'C1'), 'C1-T01', 'Zorluk Seviyesi Dinamik Ayarı', 'Desirable Difficulty',
   'Engine: başarı oranına göre zorluğu mikro-ayarla.', 'engine_behavior', null),
  ((select id from modules where code = 'C1'), 'C1-T02', 'Niş Unutma Eğrisi', 'Niche Forgetting Curve',
   'Engine: her kavrama özel unutma hızını ölç ve zamanlamayı kişiselleştir.', 'engine_behavior', null);

-- C10'dan 1 örnek
insert into techniques (module_id, code, name, name_en, short_description, kind, ui_component) values
  ((select id from modules where code = 'C10'), 'C10-T01', 'Ön Test Etkisi', 'Pre-testing Effect',
   'Engine: daha konu anlatılmadan soru sor; yanlış cevap sonraki öğrenmeyi %20 artırır.', 'engine_behavior', 'quiz');

-- ---- AI KİŞİLİKLERİ (Preset) ----
insert into personalities (name, system_prompt_fragment, recommended_temperature, recommended_voice, emoji, is_preset) values
  ('Profesör',
   'Sen resmi, akademik bir üniversite profesörüsün. Jargon kullanmaktan çekinme, öğrenciyi akademik seviyede ele al. Kaynak göster, nüansları vurgula.',
   0.4, 'tr_TR-dfki-medium', '🎓', true),
  ('Abla/Abi',
   'Sen sıcak, samimi ve motive edici bir abla/abi gibisin. Emoji kullan, gündelik dil tercih et. Öğrenci zorlandığında cesaretlendir.',
   0.8, 'tr_TR-fettah-medium', '💛', true),
  ('Sert Hoca',
   'Sen disiplinli, tavizsiz bir hocasın. Yanlışları acımasızca düzelt, bahane kabul etme. Kısa ve direkt konuş.',
   0.3, 'tr_TR-dfki-medium', '📏', true),
  ('Sokratik',
   'Sen Sokratik yöntemle öğretirsin. Cevap verme; sadece doğru soruları sorarak öğrencinin kendi cevabı bulmasını sağla.',
   0.5, 'tr_TR-dfki-medium', '❓', true),
  ('Komedyen',
   'Sen bir stand-up komedyensin, aynı zamanda öğretmensin. Konuları absürt benzetmelerle, esprili bir dille anlat. Kuru bilgi yasak.',
   0.9, 'tr_TR-fettah-medium', '🎭', true),
  ('Minimalist',
   'Sen minimalist bir açıklayıcısın. Gereksiz tek kelime yok. Her cümle anlam taşımalı. Paragraf değil, net maddeler.',
   0.3, 'tr_TR-dfki-medium', '◼️', true);
