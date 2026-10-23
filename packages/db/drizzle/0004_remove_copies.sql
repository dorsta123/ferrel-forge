ALTER TABLE "tracks" DROP CONSTRAINT "tracks_supply_range";--> statement-breakpoint
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_copies_sold_range";--> statement-breakpoint
ALTER TABLE "tracks" DROP COLUMN "total_supply";--> statement-breakpoint
ALTER TABLE "tracks" DROP COLUMN "copies_sold";