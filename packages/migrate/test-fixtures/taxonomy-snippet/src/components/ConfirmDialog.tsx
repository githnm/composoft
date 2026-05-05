import { Badge } from "./ui/Badge";
import { AlertDialogFooter } from "./ui/AlertDialogFooter";
import { Skeleton } from "./ui/Skeleton";

export function ConfirmDialog({ pending }: { pending: boolean }) {
  return (
    <div>
      {pending ? <Skeleton /> : <Badge variant="outline">ready</Badge>}
      <AlertDialogFooter>
        <button>Cancel</button>
        <button>Confirm</button>
      </AlertDialogFooter>
    </div>
  );
}
