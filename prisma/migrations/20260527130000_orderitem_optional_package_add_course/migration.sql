-- Make OrderItem.packageId nullable and introduce OrderItem.courseId so that
-- a single Order can mix Course-only purchases and Package purchases.
--
-- SQLite cannot ALTER COLUMN to drop NOT NULL or add a new FK in-place, so we
-- rebuild OrderItem using the standard create-new / copy / drop / rename
-- pattern already used elsewhere in this migrations history.
--
-- Note: a CHECK constraint requiring "exactly one of packageId/courseId"
-- is intentionally NOT added here; that invariant is enforced at the
-- application layer to keep future SQLite schema changes manageable.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "packageId" TEXT,
    "courseId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "courseIdsSnapshotJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_OrderItem" (
    "id", "orderId", "packageId", "courseId", "titleSnapshot",
    "priceCentsSnapshot", "courseIdsSnapshotJson", "createdAt"
)
SELECT
    "id",
    "orderId",
    "packageId",
    NULL,
    "titleSnapshot",
    "priceCentsSnapshot",
    "courseIdsSnapshotJson",
    "createdAt"
FROM "OrderItem";

DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_packageId_idx" ON "OrderItem"("packageId");
CREATE INDEX "OrderItem_courseId_idx" ON "OrderItem"("courseId");

PRAGMA foreign_keys=ON;
