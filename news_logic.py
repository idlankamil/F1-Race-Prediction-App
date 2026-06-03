import pandas as pd
import random
import re
from datetime import datetime
import os
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Attempt to import transformers, handle gracefully if missing
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("⚠️ 'transformers' library not found. Falling back to rule-based summarization.")

# --- CONSTANTS ---
NEWS_FILE = 'f1_news_tagged.csv'

# Driver Data
realistic_2025_drivers = [
    {'name': 'Lando Norris', 'team': 'McLaren', 'nickname': 'Lando'},
    {'name': 'Max Verstappen', 'team': 'Red Bull', 'nickname': 'Max'},
    {'name': 'Oscar Piastri', 'team': 'McLaren', 'nickname': 'Oscar'},
    {'name': 'George Russell', 'team': 'Mercedes', 'nickname': 'George'},
    {'name': 'Charles Leclerc', 'team': 'Ferrari', 'nickname': 'Charles'},
    {'name': 'Lewis Hamilton', 'team': 'Ferrari', 'nickname': 'Lewis'},
    {'name': 'Carlos Sainz', 'team': 'Williams', 'nickname': 'Carlos'},
    {'name': 'Fernando Alonso', 'team': 'Aston Martin', 'nickname': 'Fernando'},
    {'name': 'Yuki Tsunoda', 'team': 'Red Bull', 'nickname': 'Yuki'},
    {'name': 'Alexander Albon', 'team': 'Williams', 'nickname': 'Alex'},
    {'name': 'Pierre Gasly', 'team': 'Alpine', 'nickname': 'Pierre'},
    {'name': 'Esteban Ocon', 'team': 'Haas', 'nickname': 'Esteban'},
    {'name': 'Isack Hadjar', 'team': 'RB', 'nickname': 'Isack'},
    {'name': 'Gabriel Bortoleto', 'team': 'Sauber', 'nickname': 'Gabriel'},
    {'name': 'Franco Colapinto', 'team': 'Alpine', 'nickname': 'Franco'},
    {'name': 'Nico Hülkenberg', 'team': 'Sauber', 'nickname': 'Nico'},
    {'name': 'Lance Stroll', 'team': 'Aston Martin', 'nickname': 'Lance'},
    {'name': 'Oliver Bearman', 'team': 'Haas', 'nickname': 'Ollie'},
    {'name': 'Jack Doohan', 'team': 'Alpine', 'nickname': 'Jack'},
    {'name': 'Liam Lawson', 'team': 'RB', 'nickname': 'Liam'},
    {'name': 'Kimi Antonelli', 'team': 'Mercedes', 'nickname': 'Andrea'}
]

f1_teams = ['McLaren', 'Mercedes', 'Red Bull', 'Ferrari', 'Williams', 'RB', 'Aston Martin', 'Haas', 'Sauber', 'Alpine']

GREETINGS = [
    "Hey there, F1 fan! 🏎️ Ready for some racing news?",
    "Welcome back! The grid is looking spicy today! 🌶️",
    "Hello! Which driver or team are you curious about today?",
]

RESPONSE_STARTERS = [
    "Interesting question! Based on your collected news, ",
    "Great timing! Looking at your data, ",
    "Ah yes, your news feed has been talking about this! ",
]

EMOJIS = {
    'McLaren': '🧡', 'Mercedes': '⚫', 'Red Bull': '🐂', 'Ferrari': '🐎',
    'Williams': '💙', 'RB': '🔵⚪', 'Aston Martin': '💚', 'Haas': '⚫⚪',
    'Sauber': '🤍', 'Alpine': '🔷🔶'
}

# 2. SUMMARIZER CLASS
class EnhancedSpecificSummarizer:
    def __init__(self, use_bart=True):
        self.use_bart = use_bart and TRANSFORMERS_AVAILABLE
        self.summarizer = None

        if self.use_bart:
            try:
                print("📥 Loading BART model for summarization...")
                model_name = "sshleifer/distilbart-cnn-12-6"
                tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                self.summarizer = pipeline(
                    "summarization", model=model, tokenizer=tokenizer, device=-1
                )
                print("✅ BART model loaded successfully!")
            except Exception as e:
                print(f"⚠️ Could not load BART model: {e}")
                self.use_bart = False

        # COMPREHENSIVE PATTERN LIBRARY (Rule-based Fallbacks)
        self.patterns = [
            (r'.*Top \d+ of \d+: #(\d+) (.+)', lambda m: f"{self.format_name(m.group(2))} ranked #{m.group(1)} in Top 50"),
            (r'What\'s ["\'](.+)["\'] about (.+?) ability, according to Sebastian Vettel', lambda m: f"Vettel analyzes {self.format_name(m.group(2))}'s '{m.group(1)}' ability"),
            (r'(.+?) struggling in F1, and (.+?) feels? sorry for him', lambda m: f"{self.format_name(m.group(2))} sympathizes with {self.format_name(m.group(1))}'s struggles"),
            (r'(.+?) (signs|extends) (.+?) (contract|deal)', lambda m: f"{self.format_name(m.group(1))} signs new {m.group(4)}"),
            (r'(\d+) Winners and (\d+) Losers from (.+)', lambda m: f"Analysis of winners/losers from {m.group(3)}"),
            (r'.*(\bcrashed?\b|\baccident\b).*', lambda m: f"Report on {m.group(1)} incident"),
            (r'.*(\bcontract\b|\bdeal\b).*', lambda m: f"Contract negotiations update"),
        ]

        self.driver_names = {d['nickname'].lower(): d['name'] for d in realistic_2025_drivers}
        self.driver_names.update({'verstappen': 'Max Verstappen', 'hamilton': 'Lewis Hamilton', 'norris': 'Lando Norris', 'leclerc': 'Charles Leclerc'})

    def format_name(self, name):
        name_lower = name.lower().strip()
        for nickname, full in self.driver_names.items():
            if nickname in name_lower:
                return full
        return name.strip().title()

    def clean_headline(self, headline):
        if pd.isna(headline): return ""
        headline = str(headline)
        patterns = [r' - [^-]+\.com$', r' - Autosport$', r' \| F1 News$']
        for p in patterns:
            headline = re.sub(p, '', headline, flags=re.IGNORECASE)
        return headline.strip()

    def summarize_with_bart_specific(self, headline):
        try:
            clean = self.clean_headline(headline)
            prompt = f"Summarize this F1 news headline in one specific sentence: '{clean}'"
            summary = self.summarizer(prompt, max_length=60, min_length=10, do_sample=False)[0]['summary_text']
            return summary
        except:
            return None

    def summarize_rule_based_specific(self, headline):
        clean = self.clean_headline(headline)
        for pattern, func in self.patterns:
            match = re.match(pattern, clean, re.IGNORECASE)
            if match:
                try:
                    return func(match)
                except: continue
        return f"Update regarding {clean}"

    def summarize(self, text):
        if self.use_bart and len(str(text).split()) > 8:
            bart_sum = self.summarize_with_bart_specific(text)
            if bart_sum: return bart_sum
        return self.summarize_rule_based_specific(text)

# 3. CHATBOT CLASS
class F1NewsChatbot:
    def __init__(self, csv_file=NEWS_FILE):
        self.csv_file = csv_file
        self.data = None
        self.last_load = None
        self.summarizer = EnhancedSpecificSummarizer(use_bart=True) 

    def load_data(self, force_refresh=False):
        current_time = datetime.now()
        if not force_refresh and self.data is not None and self.last_load and (current_time - self.last_load).seconds < 60:
            return self.data

        if os.path.exists(self.csv_file):
            try:
                self.data = pd.read_csv(self.csv_file).fillna('General')
                # Remove duplicates
                self.data = self.data.drop_duplicates(subset=['Headline'], keep='first')
                self.last_load = current_time
            except Exception as e:
                print(f"Error loading CSV: {e}")
        return self.data

    def get_team_emoji(self, team):
        for key, emoji in EMOJIS.items():
            if key.lower() in str(team).lower():
                return emoji
        return '🏁'

    # 🟢 1. SMART KEYWORD EXTRACTION (Ignores 'stats')
    def extract_keywords(self, query):
        stopwords = {
            'what', 'whats', 'where', 'who', 'how', 'when', 'why', 'which',
            'is', 'are', 'was', 'were', 'do', 'does', 'did',
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'tell', 'me', 'about', 'news', 'latest', 'update', 'updates',
            'show', 'find', 'search', 'give', 'get',
            'stats', 'statistics', 'record', 'history', 'results', 'standings'
        }
        clean_query = re.sub(r'[^\w\s]', '', query.lower())
        return [w for w in clean_query.split() if w not in stopwords and len(w) > 2]

    # 🟢 2. SMART SEARCH (Supports Keyword Lists)
    def search_news(self, query, max_results=5):
        self.load_data()
        if self.data is None or self.data.empty: return []

        # Case 1: If query is a list of keywords (Smart Search)
        if isinstance(query, list):
            if not query: return []
            pattern = '|'.join([re.escape(k) for k in query])
            mask = self.data['Headline'].astype(str).str.contains(pattern, case=False, na=False, regex=True)
            results = self.data[mask]
            
            # Sort by relevance (keyword count)
            if not results.empty:
                results['match_score'] = results['Headline'].apply(lambda x: sum(1 for k in query if k in str(x).lower()))
                return results.sort_values('match_score', ascending=False).head(max_results).to_dict('records')
            return []

        # Case 2: Exact String Match (Fallback)
        query_lower = query.lower()
        mask = (
            self.data['Headline'].str.lower().str.contains(query_lower, na=False) |
            self.data['Driver'].str.lower().str.contains(query_lower, na=False) |
            self.data['Team'].str.lower().str.contains(query_lower, na=False)
        )
        return self.data[mask].head(max_results).to_dict('records')

    # 🟢 3. FORMATTERS (Restored)
    def format_news_item(self, item, index=None):
        headline = item.get('Headline', '')
        team = item.get('Team', '')
        link = item.get('Link', '')
        emoji = self.get_team_emoji(team)
        summary = self.summarizer.summarize(headline)
        
        prefix = f"{index}. " if index else ""
        text = f"{prefix}{emoji} **{summary}**\n"
        text += f"   📰 {headline}\n"
        if link and str(link).startswith('http'):
            text += f"   🔗 {link}\n"
        return text + "\n"

    def format_search_results(self, news_items, title):
        response = f"{title}:\n\n"
        for i, item in enumerate(news_items, 1):
            response += self.format_news_item(item, i)
        return response.strip()

    def get_help_response(self):
        return "🏎️ **F1 Bot Help**\nTry: 'Lando news', 'Red Bull updates', 'latest news', or 'search engines'."

    def get_stats_response(self):
        count = len(self.data) if self.data is not None else 0
        return f"📊 **Database Stats:**\n• Total Articles: {count}\n• Teams Covered: {len(f1_teams)}"

    def get_fallback_response(self):
        return "I couldn't find specific news for that. Try asking for 'latest news' or a driver's name!"

    # 🟢 4. HANDLERS (Restored)
    def handle_driver_query(self, query):
        for driver in realistic_2025_drivers:
            if driver['name'].lower() in query or driver['nickname'].lower() in query:
                news = self.search_news(driver['name'], max_results=3)
                if news:
                    return self.format_search_results(news, f"Here is the latest on **{driver['name']}**")
        return None

    def handle_team_query(self, query):
        for team in f1_teams:
            if team.lower() in query:
                news = self.search_news(team, max_results=3)
                if news:
                    return self.format_search_results(news, f"Latest from **{team}**")
        return None

    def handle_search_query(self, term):
        news = self.search_news(term, max_results=3)
        if news: return self.format_search_results(news, f"Search results for '{term}'")
        return f"No results found for '{term}'."

    def handle_latest_news(self):
        if self.data is None: self.load_data()
        news = self.data.head(5).to_dict('records')
        return self.format_search_results(news, "📰 **Latest F1 News**")

    # 🟢 5. MAIN LOGIC BRAIN
    def respond_to_query(self, query):
        try:
            self.load_data()
            if self.data is None or self.data.empty:
                return "❌ Database empty."

            query_lower = query.lower()

            # 1. Greetings
            if any(w in query_lower for w in ['hello', 'hi', 'hey']):
                return random.choice(GREETINGS)

            # 2. Help
            if 'help' in query_lower:
                return self.get_help_response()

            # 3. Refresh
            if "update news" in query_lower:
                self.load_data(force_refresh=True)
                return "✅ Database refreshed!"

            # 4. Driver Check (Priority 1) - Catches "Lando stats" as "Lando"
            driver_resp = self.handle_driver_query(query_lower)
            if driver_resp: return driver_resp

            # 5. Team Check (Priority 2)
            team_resp = self.handle_team_query(query_lower)
            if team_resp: return team_resp

            # 6. Generic Stats Check (Priority 3) - Only if no driver found
            if any(w in query_lower for w in ['stats', 'statistics', 'count', 'database']):
                return self.get_stats_response()

            # 7. Latest News
            if any(w in query_lower for w in ['latest', 'news', 'headlines']):
                return self.handle_latest_news()

            # 8. Smart Search Fallback
            keywords = self.extract_keywords(query)
            if keywords:
                news = self.search_news(keywords, max_results=3)
                if news: return self.format_search_results(news, f"Found articles matching '{' '.join(keywords)}'")

            return self.get_fallback_response()

        except Exception as e:
            print(f"Error: {e}")
            return "Sorry, I encountered an error."

# --- EXPOSED FUNCTIONS ---
bot_instance = F1NewsChatbot()

def query_f1_news(user_input):
    """Wrapper used by app.py"""
    return bot_instance.respond_to_query(user_input)

def update_f1_news_cache():
    """Wrapper used by app.py"""
    bot_instance.load_data(force_refresh=True)