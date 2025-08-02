import { Request, Response } from 'express';
import { pool } from '../server';
import emailService from '../services/emailService';

// Get all email templates
export const getEmailTemplates = async (req: Request, res: Response) => {
  try {
    const { category, active } = req.query;
    
    let query = 'SELECT * FROM email_templates WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }
    
    query += ' ORDER BY category, name';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      templates: result.rows
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email templates'
    });
  }
};

// Get single email template
export const getEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM email_templates WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    res.json({
      success: true,
      template: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email template'
    });
  }
};

// Create new email template
export const createEmailTemplate = async (req: Request, res: Response) => {
  try {
    const {
      name,
      subject,
      template_html,
      template_text,
      variables,
      category,
      is_active,
      send_copy_to_admin
    } = req.body;
    
    // Validate required fields
    if (!name || !subject || !template_html) {
      return res.status(400).json({
        success: false,
        error: 'Name, subject, and HTML template are required'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO email_templates 
       (name, subject, template_html, template_text, variables, category, is_active, send_copy_to_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        subject,
        template_html,
        template_text || '',
        JSON.stringify(variables || []),
        category || 'general',
        is_active !== false,
        send_copy_to_admin || false
      ]
    );
    
    res.status(201).json({
      success: true,
      template: result.rows[0],
      message: 'Email template created successfully'
    });
  } catch (error: any) {
    console.error('Error creating email template:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        error: 'A template with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create email template'
    });
  }
};

// Update email template
export const updateEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'name', 'subject', 'template_html', 'template_text',
      'variables', 'category', 'is_active', 'send_copy_to_admin'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        
        if (field === 'variables') {
          values.push(JSON.stringify(updates[field]));
        } else {
          values.push(updates[field]);
        }
        
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
      UPDATE email_templates 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    res.json({
      success: true,
      template: result.rows[0],
      message: 'Email template updated successfully'
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email template'
    });
  }
};

// Delete email template
export const deleteEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if template has been used
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM email_logs WHERE template_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete template that has been used. Consider deactivating it instead.'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM email_templates WHERE id = $1 RETURNING name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    res.json({
      success: true,
      message: `Email template '${result.rows[0].name}' deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete email template'
    });
  }
};

// Preview email template
export const previewEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variables = {} } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM email_templates WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    const template = result.rows[0];
    
    // Create sample variables if not provided
    const sampleVars = {
      client_name: variables.client_name || 'John Doe',
      first_name: variables.first_name || 'John',
      last_name: variables.last_name || 'Doe',
      username: variables.username || 'johndoe',
      interview_date: variables.interview_date || 'Luni, 15 August 2025',
      interview_time: variables.interview_time || '14:00',
      interview_type: variables.interview_type || 'Online (Video Call)',
      booking_id: variables.booking_id || '123',
      client_email: variables.client_email || 'john.doe@example.com',
      reason: variables.reason || 'Exemplu motiv anulare',
      ...variables
    };
    
    // Replace variables in template
    let htmlPreview = template.template_html;
    let textPreview = template.template_text || '';
    let subjectPreview = template.subject;
    
    Object.keys(sampleVars).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlPreview = htmlPreview.replace(regex, sampleVars[key]);
      textPreview = textPreview.replace(regex, sampleVars[key]);
      subjectPreview = subjectPreview.replace(regex, sampleVars[key]);
    });
    
    res.json({
      success: true,
      preview: {
        subject: subjectPreview,
        html: htmlPreview,
        text: textPreview,
        variables: sampleVars
      }
    });
  } catch (error) {
    console.error('Error previewing email template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview email template'
    });
  }
};

// Send test email
export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        error: 'Test email address is required'
      });
    }
    
    // Get template name
    const result = await pool.query(
      'SELECT name FROM email_templates WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    // Send test email
    await emailService.sendTestEmail(result.rows[0].name, testEmail);
    
    res.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email'
    });
  }
};

// Get email logs
export const getEmailLogs = async (req: Request, res: Response) => {
  try {
    const { templateId, status, days = 30, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        el.*,
        et.name as template_name,
        et.category as template_category
      FROM email_logs el
      LEFT JOIN email_templates et ON el.template_id = et.id
      WHERE el.created_at >= NOW() - INTERVAL '${days} days'
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (templateId) {
      query += ` AND el.template_id = $${paramIndex}`;
      params.push(templateId);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND el.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY el.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM email_logs el
      WHERE el.created_at >= NOW() - INTERVAL '${days} days'
    `;
    
    if (templateId || status) {
      const countParams: any[] = [];
      let countParamIndex = 1;
      
      if (templateId) {
        countQuery += ` AND el.template_id = $${countParamIndex}`;
        countParams.push(templateId);
        countParamIndex++;
      }
      
      if (status) {
        countQuery += ` AND el.status = $${countParamIndex}`;
        countParams.push(status);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      
      res.json({
        success: true,
        logs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } else {
      const countResult = await pool.query(countQuery);
      
      res.json({
        success: true,
        logs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    }
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email logs'
    });
  }
};

// Get email statistics
export const getEmailStatistics = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await emailService.getEmailStats(parseInt(days as string));
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching email statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email statistics'
    });
  }
};