Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FocusHelper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsZoomed(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    public static void ForceForeground(IntPtr hWnd) {
        uint nullId = 0;
        IntPtr fg = GetForegroundWindow();
        uint fgThread = GetWindowThreadProcessId(fg, out nullId);
        uint curThread = GetCurrentThreadId();

        AttachThreadInput(curThread, fgThread, true);
        keybd_event(0xA4, 0, 0, UIntPtr.Zero);
        keybd_event(0xA4, 0, 2, UIntPtr.Zero);

        if (IsZoomed(hWnd)) {
            ShowWindow(hWnd, 3)
        } else {
            ShowWindow(hWnd, 9)
        }
        SetForegroundWindow(hWnd);
        AttachThreadInput(curThread, fgThread, false);
    }
}
"@

# Try VSCode first, then Windows Terminal, then cmd/powershell
$targets = @("Code", "WindowsTerminal", "powershell", "cmd")
foreach ($name in $targets) {
    $p = Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($p) {
        [FocusHelper]::ForceForeground($p.MainWindowHandle)
        break
    }
}
