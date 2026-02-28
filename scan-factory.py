#!/usr/bin/env python3
"""
Factory Build Scanner — Reads ~/.openclaw/factory/builds/ and generates
real factory data for Mission Control's Pipeline Tracker.

Run this anytime builds change:
  python3 scan-factory.py

Agents can also run this after completing tasks.
Output: factory-data.js (loaded by index.html)
"""

import os
import json
import glob
from datetime import datetime

BUILDS_DIR = os.path.expanduser("~/.openclaw/factory/builds")
BRIEFS_DIR = os.path.expanduser("~/.openclaw/factory/briefs")
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "factory-data.js")

def detect_stage(build_path):
    """Determine stage based on actual files present."""
    files = set()
    for root, dirs, filenames in os.walk(build_path):
        for f in filenames:
            files.add(f.lower())
        # Don't recurse too deep
        if root.count(os.sep) - build_path.count(os.sep) > 2:
            break
    
    has_handoff = "handoff.md" in files
    has_xcodeproj = any(f.endswith(".pbxproj") for f in files)
    has_swift = any(f.endswith(".swift") for f in files)
    has_qa_issues = "qa_issues.md" in files
    has_screenshots = os.path.isdir(os.path.join(build_path, "Screenshots"))
    has_appstore = os.path.isdir(os.path.join(build_path, "appstore"))
    has_brand = any("brand" in f for f in files)
    has_design = any("design" in f for f in files)
    has_research = any("research" in f for f in files)
    
    # Determine stage from most advanced to least
    # STRICT: distributing = Nova has actually created appstore assets + handoff exists
    if has_appstore and has_handoff:
        return "distributing"  # Nova has done her job
    if has_handoff:
        return "approval"  # Ready for review, but Nova hasn't done assets yet
    if has_qa_issues:
        return "testing"  # QA in progress
    if has_xcodeproj or has_swift:
        return "building"  # Code exists
    if has_brand:
        return "vetted"  # Brand-checked but not coded yet
    return "new-idea"  # Just briefs/specs, unvetted

def detect_agent(build_path, stage):
    """Guess the responsible agent based on stage and files."""
    if stage in ("research", "new-idea"):
        return "luna"
    if stage == "vetted":
        return "blaze"
    if stage == "building":
        return "ivy"
    if stage in ("testing", "approval"):
        return "vex"
    if stage == "distributing":
        return "nova"
    return "luna"

def count_swift_files(build_path):
    """Count .swift files in the build."""
    count = 0
    for root, dirs, files in os.walk(build_path):
        count += sum(1 for f in files if f.endswith(".swift"))
    return count

def find_xcodeproj(build_path):
    """Find .xcodeproj relative to build path."""
    for root, dirs, files in os.walk(build_path):
        for d in dirs:
            if d.endswith(".xcodeproj"):
                full = os.path.join(root, d)
                return os.path.relpath(full, build_path)
    return ""

def find_brand_info(build_path, slug):
    """Check for brand verification data."""
    brand = {"domain": "", "trademark": "pending", "socials": ""}
    
    # Check for brand files in the build
    for root, dirs, files in os.walk(build_path):
        for f in files:
            if "brand" in f.lower() or "trademark" in f.lower():
                fpath = os.path.join(root, f)
                try:
                    with open(fpath, 'r') as fp:
                        content = fp.read().lower()
                        if "domain" in content:
                            brand["domain"] = f"checked"
                        if "clear" in content or "available" in content:
                            brand["trademark"] = "cleared"
                        if "@" in content or "social" in content:
                            brand["socials"] = "checked"
                except:
                    pass
    return brand if brand["domain"] or brand["trademark"] != "pending" else None

def get_description(build_path, slug):
    """Get a description from available files."""
    # Try HANDOFF.md first
    handoff = os.path.join(build_path, "HANDOFF.md")
    if os.path.exists(handoff):
        try:
            with open(handoff, 'r') as f:
                lines = f.readlines()
                for line in lines[:5]:
                    line = line.strip().lstrip("# ").strip()
                    if line and not line.startswith("Build") and len(line) > 3:
                        return line[:60]
        except:
            pass
    
    # Try brief
    brief = os.path.join(BRIEFS_DIR, f"{slug}.md")
    if os.path.exists(brief):
        try:
            with open(brief, 'r') as f:
                lines = f.readlines()
                for line in lines[:5]:
                    line = line.strip().lstrip("# ").strip()
                    if line and len(line) > 3:
                        return line[:60]
        except:
            pass
    
    swift_count = count_swift_files(build_path)
    if swift_count:
        return f"{swift_count} Swift files"
    return "In progress"

def scan():
    """Scan all factory builds and generate real data."""
    if not os.path.isdir(BUILDS_DIR):
        print(f"No builds directory at {BUILDS_DIR}")
        return []
    
    items = []
    item_id = 1000
    
    for entry in sorted(os.listdir(BUILDS_DIR)):
        build_path = os.path.join(BUILDS_DIR, entry)
        if not os.path.isdir(build_path):
            continue
        
        # Clean name from slug
        name = entry.replace("-research", "").replace("-brand", "").replace("-brief", "")
        name = " ".join(word.capitalize() for word in name.split("-"))
        
        stage = detect_stage(build_path)
        agent = detect_agent(build_path, stage)
        xcodeproj = find_xcodeproj(build_path)
        description = get_description(build_path, entry)
        brand = find_brand_info(build_path, entry)
        
        item = {
            "id": item_id,
            "name": name,
            "type": "app",
            "stage": stage,
            "agent": agent,
            "revenue": description,
            "slug": entry,
            "xcodeProj": xcodeproj,
        }
        
        if brand:
            item["brand"] = brand
        
        # Read TestFlight URL if saved
        tf_file = os.path.join(build_path, "TESTFLIGHT_URL")
        if os.path.exists(tf_file):
            try:
                with open(tf_file, 'r') as f:
                    tf_url = f.read().strip()
                    if tf_url and "PENDING" not in tf_url:
                        item["testflightUrl"] = tf_url
            except:
                pass
        
        # Note if deploy script exists
        if os.path.exists(os.path.join(build_path, "deploy-to-phone.sh")):
            item["hasDeployScript"] = True
        
        item_id += 1
        items.append(item)
    
    return items

def main():
    print(f"Scanning {BUILDS_DIR}...")
    items = scan()
    
    # Count by stage
    stages = {}
    for item in items:
        stages[item["stage"]] = stages.get(item["stage"], 0) + 1
    
    print(f"\nFound {len(items)} builds:")
    for stage, count in sorted(stages.items()):
        print(f"  {stage}: {count}")
    
    # Write JS file
    js_content = f"""// Auto-generated by scan-factory.py at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// Run: python3 scan-factory.py
// DO NOT EDIT — this file is overwritten on each scan
window.FACTORY_SCAN = {json.dumps(items, indent=2)};
"""
    
    with open(OUTPUT_FILE, 'w') as f:
        f.write(js_content)
    
    print(f"\nWritten to {OUTPUT_FILE}")
    print("Reload Mission Control to see updated data.")

if __name__ == "__main__":
    main()
