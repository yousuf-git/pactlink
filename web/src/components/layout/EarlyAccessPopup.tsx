import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const SEEN_KEY = "pactlink.earlyaccess.seen";

// First-visit popup (quick-web global requirement). Fits the product: early
// access is the only path (no self-serve signup), so the popup invites a
// sandbox try, not a discount.
export function EarlyAccessPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY)) return;
    const t = setTimeout(() => setOpen(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={close} size="sm">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <Sparkles size={22} />
        </div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          See the whole flow in 2 minutes
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
          Open a no-signup sandbox loaded with real example quotes. Build one,
          send it, then approve and pay a deposit as the client — webhook-first,
          end to end.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            fullWidth
            onClick={() => {
              close();
              navigate("/sandbox-login");
            }}
          >
            Open the sandbox
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              close();
              navigate("/pricing");
            }}
          >
            Request early access instead
          </Button>
        </div>
      </div>
    </Modal>
  );
}
