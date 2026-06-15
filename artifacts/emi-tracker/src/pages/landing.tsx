import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingDown, Calendar, CreditCard } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">৳</div>
          <span className="text-lg font-bold text-foreground">EMI Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost">লগইন</Button>
          </Link>
          <Link href="/sign-up">
            <Button>শুরু করুন</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              আপনার সব কিস্তির হিসাব<br />
              <span className="text-primary">এক জায়গায়</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              EMI Tracker দিয়ে সহজে আপনার মাসিক কিস্তি ট্র্যাক করুন, বাকি পরিমাণ দেখুন এবং সময়মতো পরিশোধ করুন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                বিনামূল্যে শুরু করুন <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                লগইন করুন
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            <div className="p-6 rounded-xl border border-border bg-card text-left space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">কিস্তি ট্র্যাক করুন</h3>
              <p className="text-sm text-muted-foreground">প্রতিটি EMI এর payment history এবং বাকি পরিমাণ দেখুন।</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card text-left space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Due Date মনে রাখুন</h3>
              <p className="text-sm text-muted-foreground">পরবর্তী কিস্তির তারিখ সবসময় সামনে দেখুন।</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card text-left space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Auto Calculation</h3>
              <p className="text-sm text-muted-foreground">Overpayment এ automatically পরবর্তী কিস্তি adjust হয়।</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} EMI Tracker
      </footer>
    </div>
  );
}
