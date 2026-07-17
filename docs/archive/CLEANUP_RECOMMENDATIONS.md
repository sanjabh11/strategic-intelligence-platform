# Code Cleanup Recommendations
**Date**: October 7, 2025

---

## 🗑️ Files Safe to Remove (Debug Utilities)

### Test/Debug Functions (Optional)
These functions were created for debugging during development and can be removed in production:

```bash
supabase/functions/test-perplexity/     # Debug: Test Perplexity API directly
supabase/functions/test-secrets/        # Debug: Verify secrets are accessible
```

**Recommendation**: 
- ⚠️ **Keep for now** - Useful for production debugging
- 🗑️ **Remove later** - After deployment is stable (30 days)

**How to Remove**:
```bash
# Archive first (optional)
mkdir -p archive/debug-functions
mv supabase/functions/test-perplexity archive/debug-functions/
mv supabase/functions/test-secrets archive/debug-functions/

# Or delete directly
rm -rf supabase/functions/test-perplexity
rm -rf supabase/functions/test-secrets

# If already deployed to Supabase, delete remotely:
supabase functions delete test-perplexity --project-ref jxdihzqoaxtydolmltdr
supabase functions delete test-secrets --project-ref jxdihzqoaxtydolmltdr
```

---

## 📂 Files to Archive (Documentation)

### Temporary Documentation Created During Development
```bash
EXTERNAL_SOURCES_FIX.md          # Diagnostic notes from debugging session
```

**Recommendation**: Move to `docs/troubleshooting/`

**How to Archive**:
```bash
mkdir -p docs/troubleshooting
mv EXTERNAL_SOURCES_FIX.md docs/troubleshooting/external-sources-debugging.md
```

---

## ✅ Files to Keep (Important)

### Session Documentation
```bash
SESSION_IMPROVEMENTS_SUMMARY.md  # ✅ KEEP - Implementation record
SECURITY_AUDIT.md                # ✅ KEEP - Security compliance
CLEANUP_RECOMMENDATIONS.md       # ✅ KEEP - This file
```

### Core Application Files
```bash
src/components/ui/*              # ✅ KEEP - UI component library
supabase/functions/analyze-engine/  # ✅ KEEP - Core analysis
supabase/functions/*/            # ✅ KEEP - All 41 production functions
README.md                        # ✅ KEEP - Main documentation
docs/prd.md                      # ✅ KEEP - Product requirements
```

---

## 🧹 Recommended Cleanup Actions

### Immediate (Before Production Deploy)
```bash
# None required - all files are valuable for now
```

### After 30 Days in Production
```bash
# 1. Remove debug functions if not used
rm -rf supabase/functions/test-perplexity
rm -rf supabase/functions/test-secrets

# 2. Archive old diagnostic docs
mkdir -p archive/development-docs
mv EXTERNAL_SOURCES_FIX.md archive/development-docs/
```

### After 90 Days in Production
```bash
# Review and potentially remove:
# - Old migration files (if new schema is stable)
# - Deprecated edge functions (check usage logs)
# - Old documentation versions
```

---

## 📊 File Count Summary

| Category | Count | Status |
|----------|-------|--------|
| Production Edge Functions | 41 | ✅ Keep |
| Debug Functions | 2 | ⚠️ Review after 30 days |
| UI Components | 4 | ✅ Keep |
| Documentation Files | 15+ | ✅ Keep (essential) |
| Test Files | 5+ | ✅ Keep |
| Migration Files | 20+ | ✅ Keep |

---

## 🎯 Final Recommendation

**Current State**: ✅ **NO CLEANUP NEEDED**

All files serve a purpose:
- Debug functions: Useful for production troubleshooting
- Documentation: Critical for maintenance and onboarding
- Code: All production-ready

**Action**: Proceed with deployment as-is. Schedule cleanup review in 30 days.

---

## 📋 Future Cleanup Checklist

After deployment, monitor these for potential removal:

- [ ] `test-perplexity` function (check usage logs)
- [ ] `test-secrets` function (check usage logs)
- [ ] Old session notes (after archived)
- [ ] Deprecated dependencies (run `npm outdated`)
- [ ] Unused database tables (query usage stats)

---

**Last Updated**: October 7, 2025
