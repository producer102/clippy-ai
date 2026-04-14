-- Try to activate VS Code, then Terminal, then iTerm
try
    tell application "System Events"
        if (exists (processes where name is "Code")) then
            tell application "Visual Studio Code" to activate
            return
        end if
    end tell
end try

try
    tell application "System Events"
        if (exists (processes where name is "Terminal")) then
            tell application "Terminal" to activate
            return
        end if
    end tell
end try

try
    tell application "System Events"
        if (exists (processes where name is "iTerm2")) then
            tell application "iTerm" to activate
            return
        end if
    end tell
end try
