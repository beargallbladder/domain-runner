import os
import requests
import json
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.environ.get('RESEND_API_KEY')
        self.from_email = os.environ.get('FROM_EMAIL', 'alerts@yourdomain.com')
        self.base_url = 'https://api.resend.com'
        
        if not self.api_key:
            logger.warning("RESEND_API_KEY not found in environment variables")
    
    def send_email(self, to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
        """Send email using Resend API"""
        if not self.api_key:
            logger.error("Cannot send email: RESEND_API_KEY not configured")
            return False
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'from': self.from_email,
            'to': [to],
            'subject': subject,
            'html': html
        }
        
        if text:
            payload['text'] = text
        
        try:
            response = requests.post(
                f'{self.base_url}/emails',
                headers=headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Email sent successfully to {to}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Email sending failed: {str(e)}")
            return False
    
    def send_welcome_email(self, user_email: str, user_name: str = None) -> bool:
        """Send welcome email to new users"""
        display_name = user_name or user_email.split('@')[0]
        
        subject = "🎉 Welcome to AI Memory Dashboard - Your Brand Intelligence Journey Starts Now!"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to AI Memory Dashboard</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #007AFF; font-size: 32px; margin-bottom: 10px;">🧠 AI Memory Dashboard</h1>
                <p style="color: #666; font-size: 18px;">The first platform to measure AI brand memory across 17+ LLM providers</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: white;">Welcome, {display_name}! 🚀</h2>
                <p style="margin: 0; font-size: 16px; opacity: 0.9; color: white;">You're now part of the AI revolution in brand intelligence</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h3 style="color: #007AFF; margin-bottom: 15px;">🎯 What You Can Do Now:</h3>
                <ul style="padding-left: 0; list-style: none;">
                    <li style="margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007AFF;">
                        <strong>📊 View Public Rankings:</strong> See how top brands perform in AI memory
                    </li>
                    <li style="margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #34C759;">
                        <strong>🔍 Track 1 Domain (Free):</strong> Monitor your brand's AI memory score
                    </li>
                    <li style="margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #FF9500;">
                        <strong>📈 Basic Analytics:</strong> Understand AI consensus patterns
                    </li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://frontend-lhmtyty1k-sams-projects-bf92499c.vercel.app/dashboard" 
                   style="background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
                   🚀 Access Your Dashboard
                </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0;">
                <h3 style="color: #007AFF; margin-bottom: 15px;">💎 Ready for More?</h3>
                <p style="margin-bottom: 15px;">Unlock the full power of AI brand intelligence:</p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Pro ($49/month):</strong> 10 domains, competitor analysis, API access</li>
                    <li><strong>Enterprise ($199/month):</strong> 100+ domains, white-label reports, priority support</li>
                </ul>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="https://frontend-lhmtyty1k-sams-projects-bf92499c.vercel.app/pricing" 
                       style="color: #007AFF; text-decoration: none; font-weight: 600;">
                       View Pricing Plans →
                    </a>
                </div>
            </div>
            
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                <p>Questions? Reply to this email or check our <a href="https://frontend-lhmtyty1k-sams-projects-bf92499c.vercel.app/help" style="color: #007AFF;">help center</a>.</p>
                <p style="margin-top: 15px;">
                    <strong>AI Memory Dashboard</strong><br>
                    Measuring artificial intelligence, one brand at a time.
                </p>
            </div>
            
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, html)
    
    def send_password_reset_email(self, user_email: str, reset_token: str) -> bool:
        """Send password reset email"""
        reset_url = f"https://frontend-lhmtyty1k-sams-projects-bf92499c.vercel.app/reset-password?token={reset_token}"
        
        subject = "🔐 Reset Your AI Memory Dashboard Password"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #007AFF; font-size: 28px;">🔐 Password Reset Request</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">We received a request to reset your password for your AI Memory Dashboard account.</p>
                <p style="margin: 0; color: #666;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
                   Reset Your Password
                </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                    <strong>⚠️ Security Notice:</strong> This link expires in 1 hour for your security.
                </p>
            </div>
            
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                <p>If the button doesn't work, copy and paste this link:</p>
                <p style="word-break: break-all; color: #007AFF;">{reset_url}</p>
            </div>
            
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, html)
    
    def send_memory_score_alert(self, user_email: str, domain: str, old_score: float, new_score: float, change_percent: float) -> bool:
        """Send AI memory score change alert"""
        change_direction = "📈 increased" if new_score > old_score else "📉 decreased"
        change_color = "#34C759" if new_score > old_score else "#FF3B30"
        
        subject = f"🚨 AI Memory Alert: {domain} score {change_direction} by {abs(change_percent):.1f}%"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #007AFF; font-size: 28px;">🚨 AI Memory Score Alert</h1>
            </div>
            
            <div style="background: linear-gradient(135deg, {change_color} 0%, {change_color}CC 100%); color: white; padding: 25px; border-radius: 15px; text-align: center; margin-bottom: 25px;">
                <h2 style="margin: 0 0 10px 0; color: white;">{domain}</h2>
                <p style="margin: 0; font-size: 18px; opacity: 0.9; color: white;">Memory score {change_direction} by {abs(change_percent):.1f}%</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin: 25px 0;">
                <div style="text-align: center; flex: 1;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-right: 10px;">
                        <h3 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">PREVIOUS SCORE</h3>
                        <div style="font-size: 32px; font-weight: 700; color: #666;">{old_score:.1f}</div>
                    </div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="background: {change_color}20; padding: 20px; border-radius: 10px; margin-left: 10px; border: 2px solid {change_color};">
                        <h3 style="margin: 0 0 10px 0; color: {change_color}; font-size: 14px;">CURRENT SCORE</h3>
                        <div style="font-size: 32px; font-weight: 700; color: {change_color};">{new_score:.1f}</div>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 25px 0;">
                <h3 style="color: #007AFF; margin-bottom: 15px;">🔍 What This Means:</h3>
                <p style="margin: 0;">Your brand's AI memory strength has changed across our 17+ LLM provider network. This affects how AI systems remember and recall your brand.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://frontend-lhmtyty1k-sams-projects-bf92499c.vercel.app/dashboard" 
                   style="background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
                   📊 View Detailed Analysis
                </a>
            </div>
            
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, html)
    
    def send_subscription_change_email(self, user_email: str, old_plan: str, new_plan: str) -> bool:
        """Send subscription change notification"""
        subject = f"💎 Subscription Updated: Welcome to {new_plan.title()} Plan!"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0 0 15px 0; color: white;">💎 Subscription Updated!</h1>
                <p style="margin: 0; font-size: 18px; opacity: 0.9; color: white;">You've upgraded to {new_plan.title()} plan</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
                <h3 style="color: #007AFF; margin-bottom: 15px;">🚀 Your New Features:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    {self._get_plan_features(new_plan)}
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://frontend-lhmtyty1k-sams-projects-bf92499c.vercel.app/dashboard" 
                   style="background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
                   🎯 Explore Your New Features
                </a>
            </div>
            
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, html)
    
    def _get_plan_features(self, plan: str) -> str:
        """Get HTML list of plan features"""
        features = {
            'pro': [
                "Track up to 10 domains",
                "1,000 API calls per day", 
                "Competitor analysis",
                "Email alerts for score changes",
                "Priority support"
            ],
            'enterprise': [
                "Track 100+ domains",
                "10,000 API calls per day",
                "White-label reports", 
                "Advanced integrations",
                "Dedicated support",
                "SLA guarantees"
            ]
        }
        
        plan_features = features.get(plan.lower(), [])
        return '\n'.join([f'<li>{feature}</li>' for feature in plan_features])

# Global email service instance
email_service = EmailService() 