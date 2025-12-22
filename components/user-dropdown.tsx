'use client';

import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Store, Check, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/(auth)/actions';
import { useUserAccounts } from '@/hooks/use-user-accounts';

interface UserDropdownProps {
  user: User;
  currentSubdomain?: string;
}

export function UserDropdown({ user, currentSubdomain }: UserDropdownProps) {
  const { accounts, loading } = useUserAccounts();
  const hasMultipleAccounts = accounts.length > 1;

  const handleSwitchAccount = (subdomain: string) => {
    // Navigate to the selected subdomain
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'sellercentry.com';
    const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
    window.location.href = `${protocol}://${subdomain}.${rootDomain}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="touch-target flex items-center gap-2 px-2"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-primary" />
          </div>
          <span className="hidden sm:inline text-sm text-muted-foreground max-w-[150px] truncate">
            {user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Account</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Account Switcher - only show if user has multiple accounts */}
        {!loading && hasMultipleAccounts && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Store className="mr-2 h-4 w-4" />
                <span>Switch Account</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56">
                  {accounts.map((account) => {
                    const isCurrentAccount = currentSubdomain === account.subdomain;
                    return (
                      <DropdownMenuItem
                        key={account.subdomain}
                        onClick={() => !isCurrentAccount && handleSwitchAccount(account.subdomain)}
                        className={`cursor-pointer ${isCurrentAccount ? 'bg-primary/10' : ''}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{account.storeName}</span>
                          {isCurrentAccount && (
                            <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}

        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
